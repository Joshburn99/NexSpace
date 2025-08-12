import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import YAML from "yaml";
import type { OpenAPIV3 } from "openapi-types";

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load and parse the OpenAPI specification
export function loadOpenAPISpec(): OpenAPIV3.Document {
  try {
    const openApiPath = path.join(__dirname, "openapi.yaml");
    const yamlContent = fs.readFileSync(openApiPath, "utf8");
    const spec = YAML.parse(yamlContent) as OpenAPIV3.Document;
    
    // Update server URLs based on environment
    const serverUrl = process.env.NODE_ENV === 'production' 
      ? process.env.PRODUCTION_URL || 'https://your-production-domain.com'
      : `http://localhost:${process.env.PORT || 5000}`;
    
    spec.servers = [
      {
        url: serverUrl,
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
      }
    ];
    
    return spec;
  } catch (error) {
    console.error("Failed to load OpenAPI specification:", error);
    throw error;
  }
}

// Swagger UI configuration
export const swaggerOptions = {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'list',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
  },
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin-bottom: 20px; }
    .swagger-ui .scheme-container { background: #fafafa; padding: 15px; margin-bottom: 20px; }
  `,
  customSiteTitle: "NexSpace API Documentation",
  customfavIcon: "/favicon.ico"
};