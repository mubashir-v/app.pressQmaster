export default function PagePanel({ title, children, actions }) {
  return (
    <div className="gov-panel">
      {(title || actions) && (
        <div className="gov-panel-header flex items-center justify-between">
          {title && <h2 className="text-lg font-bold text-gray-900">{title}</h2>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="gov-panel-body">{children}</div>
    </div>
  );
}
