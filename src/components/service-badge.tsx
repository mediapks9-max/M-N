interface ServiceBadgeProps {
  name: string;
  color: string;
}

export function ServiceBadge({ name, color }: ServiceBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: `${color}1a`,
        borderColor: `${color}66`,
        color,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {name}
    </span>
  );
}
