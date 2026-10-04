const STATUS_LABELS = ["CREATED", "VOTING", "APPROVED", "REJECTED", "EXECUTED"];

const STATUS_CLASSES = {
  CREATED: "badge-grey",
  VOTING: "badge-blue",
  APPROVED: "badge-green",
  REJECTED: "badge-red",
  EXECUTED: "badge-grey",
};

function StatusBadge({ status }) {
  const label = typeof status === "number" ? STATUS_LABELS[status] : status;
  const className = STATUS_CLASSES[label] || "badge-grey";

  return <span className={`status-badge ${className}`}>{label}</span>;
}

export default StatusBadge;