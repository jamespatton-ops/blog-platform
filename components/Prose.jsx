export default function Prose({ html }) {
  return (
    <article
      dangerouslySetInnerHTML={{ __html: html }}
      style={{ fontSize: '1rem', wordBreak: 'break-word' }}
    />
  );
}
