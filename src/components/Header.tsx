export function Header() {
  return (
    <header className="header">
      <h1>AgentTrace</h1>
      <p className="tagline">
        Turn an AI coding session into an understandable development timeline.
      </p>
      <span className="badge" title="Files are read and parsed in your browser. Nothing is sent anywhere.">
        ● 100% local, nothing uploaded
      </span>
    </header>
  );
}
