export default function Prose({ html }: { html: string }) {
  return (
    <article
      dangerouslySetInnerHTML={{ __html: html }}
      style={{ fontSize: '1rem', wordBreak: 'break-word' }}
    />
  );
}
