interface ErrorPanelProps {
  message: string;
}

export function ErrorPanel({ message }: ErrorPanelProps) {
  return <div className="status-panel error" role="alert">{message}</div>;
}
