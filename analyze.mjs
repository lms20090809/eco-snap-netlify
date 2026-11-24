const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_BASE64_LENGTH = Math.ceil(MAX_IMAGE_BYTES / 3) * 4;
const MAX_REQUEST_BYTES = 5_800_000;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_MATERIALS = ["plastic", "carton", "metal", "glass", "organic", "mixed"];
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-4o-mini";
const IMAGE_SIGNATURES = {
  "image/jpeg": (image) => image.length >= 3 && image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff,
  "image/png": (image) => image.length >= 8
    && image.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/webp": (image) => image.length >= 12
    && image.toString("ascii", 0, 4) === "RIFF"
    && image.toString("ascii", 8, 12) === "WEBP",
};

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function jsonResponse(statusCode, body) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function isAllowedBase64(value) {
  const chunkSize = 64 * 1024;
  for (let offset = 0; offset < value.length; offset += chunkSize) {
    if (!/^[A-Za-z0-9+\/]+$/.test(value.slice(offset, offset + chunkSize))) return false;
  }
  return true;
}

function validateImagePayload(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(400, "Se esperaba un objeto JSON con imageDataUrl y mimeType.");
  }

  const keys = Object.keys(body);
  if (keys.length !== 2 || !keys.includes("imageDataUrl") || !keys.includes("mimeType")) {
    throw new ApiError(400, "El cuerpo debe contener únicamente imageDataUrl y mimeType.");
  }
  if (typeof body.mimeType !== "string" || !ALLOWED_MIME_TYPES.has(body.mimeType)) {
    throw new ApiError(415, "Formato no admitido. Usa una imagen JPEG, PNG o WebP.");
  }
  if (typeof body.imageDataUrl !== "string") {
    throw new ApiError(400, "imageDataUrl debe ser una imagen Base64.");
  }

  const prefix = `data:${body.mimeType};base64,`;
  if (!body.imageDataUrl.startsWith(prefix)) {
    throw new ApiError(400, "imageDataUrl debe coincidir con mimeType y usar Base64.");
  }
  const base64 = body.imageDataUrl.slice(prefix.length);
  if (!base64) {
    throw new ApiError(400, "La imagen está vacía.");
  }
  if (base64.length > MAX_BASE64_LENGTH) {
    throw new ApiError(413, "La imagen enviada a la función supera el límite de 4 MiB.");
  }
  if (base64.length % 4 !== 0) {
    throw new ApiError(400, "La imagen Base64 no tiene un formato válido.");
  }

  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  const decodedLength = (base64.length / 4) * 3 - padding;
  if (decodedLength > MAX_IMAGE_BYTES) {
    throw new ApiError(413, "La imagen enviada a la función supera el límite de 4 MiB.");
  }
  const data = base64.slice(0, base64.length - padding);
  if (!decodedLength || !isAllowedBase64(data)) {
    throw new ApiError(400, "La imagen Base64 no tiene un formato válido.");
  }

  const image = Buffer.from(base64, "base64");
  if (image.length > MAX_IMAGE_BYTES) {
    throw new ApiError(413, "La imagen enviada a la función supera el límite de 4 MiB.");
  }
  if (image.toString("base64") !== base64) {
    throw new ApiError(400, "La imagen Base64 no tiene un formato válido.");
  }
  if (!IMAGE_SIGNATURES[body.mimeType](image)) {
    throw new ApiError(415, "El contenido de la imagen no coincide con mimeType.");
  }

  return { mimeType: body.mimeType, base64 };
}

function createOpenRouterRequest({ mimeType, base64, model }) {
  return {
    model,
    messages: [{
      role: "user",
      content: [
        {
          type: "text",
          text: [
            "Analiza la imagen y responde en español, de forma amigable y breve.",
            "Describe solo alimentos y envases que sean claramente visibles; no inventes elementos.",
            `En materials usa únicamente estos valores: ${ALLOWED_MATERIALS.join(", ")}.`,
            "Incluye en materials todos los materiales visibles que puedas identificar; usa mixed si la identificación es incierta.",
            "Sugiere cómo separar o reciclarlos con cautela, indicando que las reglas dependen del municipio.",
            "Devuelve estrictamente un único objeto JSON con exactamente las claves message, materials y tip, sin Markdown ni texto adicional.",
          ].join(" "),
        },
        { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
      ],
    }],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "eco_snap_analysis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            message: { type: "string" },
            materials: { type: "array", items: { type: "string", enum: ALLOWED_MATERIALS } },
            tip: { type: "string" },
          },
          required: ["message", "materials", "tip"],
          additionalProperties: false,
        },
      },
    },
    temperature: 0.2,
    max_tokens: 512,
  };
}

function parseOpenRouterResponse(upstreamBody) {
  const content = upstreamBody?.choices?.[0]?.message?.content;
  const text = typeof content === "string"
    ? content.trim()
    : Array.isArray(content)
      ? content.map((part) => typeof part?.text === "string" ? part.text : "").join("").trim()
      : "";

  let result;
  try {
    result = JSON.parse(text);
  } catch {
    throw new ApiError(502, "El servicio de análisis devolvió una respuesta vacía o no válida.");
  }
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new ApiError(502, "El servicio de análisis devolvió una respuesta vacía o no válida.");
  }

  const keys = Object.keys(result);
  if (
    keys.length !== 3
    || !keys.includes("message")
    || !keys.includes("materials")
    || !keys.includes("tip")
    || typeof result.message !== "string"
    || !result.message.trim()
    || result.message.length > 1200
    || typeof result.tip !== "string"
    || !result.tip.trim()
    || result.tip.length > 280
    || !Array.isArray(result.materials)
    || result.materials.length === 0
    || result.materials.length > ALLOWED_MATERIALS.length
    || result.materials.some((material) => !ALLOWED_MATERIALS.includes(material))
    || new Set(result.materials).size !== result.materials.length
  ) {
    throw new ApiError(502, "El servicio de análisis devolvió una respuesta vacía o no válida.");
  }

  return { message: result.message.trim(), materials: result.materials, tip: result.tip.trim() };
}

export async function analyzeImage({
  body,
  apiKey = process.env.OPENROUTER_API_KEY,
  model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
  fetchImpl = fetch,
}) {
  const image = validateImagePayload(body);
  if (typeof apiKey !== "string" || !apiKey.trim()) {
    throw new ApiError(503, "El servicio de análisis no está configurado.");
  }
  if (typeof model !== "string" || !model.trim() || model.length > 200) {
    throw new ApiError(503, "El modelo de análisis no está configurado correctamente.");
  }

  let upstream;
  try {
    upstream = await fetchImpl(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(createOpenRouterRequest({ ...image, model: model.trim() })),
      signal: AbortSignal.timeout(25_000),
    });
  } catch {
    throw new ApiError(502, "No se pudo completar el análisis con OpenRouter. Inténtalo de nuevo más tarde.");
  }
  if (!upstream.ok) {
    throw new ApiError(502, "No se pudo completar el análisis con OpenRouter. Inténtalo de nuevo más tarde.");
  }

  let responseBody;
  try {
    responseBody = await upstream.json();
  } catch {
    throw new ApiError(502, "El servicio de análisis devolvió una respuesta vacía o no válida.");
  }
  return parseOpenRouterResponse(responseBody);
}

export function createHandler(options = {}) {
  return async (request) => {
    if (request.method !== "POST") {
      return jsonResponse(405, { error: "Método no permitido." });
    }
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return jsonResponse(415, { error: "La solicitud debe usar Content-Type application/json." });
    }

    const rawContentLength = request.headers.get("content-length");
    const contentLength = rawContentLength === null ? null : Number(rawContentLength);
    if (contentLength !== null && Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
      return jsonResponse(413, { error: "La solicitud supera el límite permitido." });
    }

    let body;
    try {
      const rawBody = await request.text();
      if (Buffer.byteLength(rawBody, "utf8") > MAX_REQUEST_BYTES) {
        return jsonResponse(413, { error: "La solicitud supera el límite permitido." });
      }
      body = JSON.parse(rawBody);
    } catch {
      return jsonResponse(400, { error: "El cuerpo JSON no tiene un formato válido." });
    }

    try {
      return jsonResponse(200, await analyzeImage({ ...options, body }));
    } catch (error) {
      if (error instanceof ApiError) {
        return jsonResponse(error.status, { error: error.message });
      }
      return jsonResponse(500, { error: "Error interno del servidor." });
    }
  };
}

export default createHandler();
