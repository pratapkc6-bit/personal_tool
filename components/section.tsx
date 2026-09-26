export function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="nexus-section">
      <div className="nexus-section-head">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
