/**
 * JSON-LD Structured Data Components
 * Renders JSON-LD scripts safely for SEO structured data
 */

/**
 * Renders a single JSON-LD schema
 * @param {Object} props
 * @param {Object} props.schema - The JSON-LD schema object
 */
export function JsonLd({ schema }) {
  if (!schema) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema),
      }}
    />
  );
}

/**
 * Renders multiple JSON-LD schemas
 * @param {Object} props
 * @param {Array<Object>} props.schemas - Array of JSON-LD schema objects
 */
export function MultiJsonLd({ schemas }) {
  if (!schemas || schemas.length === 0) return null;

  // Filter out null/undefined schemas
  const validSchemas = schemas.filter(Boolean);

  if (validSchemas.length === 0) return null;

  return (
    <>
      {validSchemas.map((schema, index) => (
        <JsonLd key={`jsonld-${index}`} schema={schema} />
      ))}
    </>
  );
}
