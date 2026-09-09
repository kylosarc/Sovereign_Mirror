interface ModuleStubProps {
  pillar: number;
  title: string;
  subtitle: string;
  description: string;
}

export function ModuleStub({ pillar, title, subtitle, description }: ModuleStubProps) {
  return (
    <div className="stub-container">
      <div className="stub-card">
        <div className="stub-tag">PILLAR {pillar} - CORE MODULE</div>
        <h2 className="stub-title">{title}</h2>
        <div className="stub-subtitle">{subtitle}</div>
        <p className="stub-desc">{description}</p>
        <div className="stub-badge">
          INTERACTIVE MODULE IN DEVELOPMENT
        </div>
      </div>
    </div>
  );
}
