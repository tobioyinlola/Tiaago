const JsonLd = ({ data }: { data: Record<string, unknown> }) => (
  // eslint-disable-next-line react/no-danger
  <script
    type='application/ld+json'
    dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
  />
);

export default JsonLd;
