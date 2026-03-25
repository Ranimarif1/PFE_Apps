import '../styles/StatusBadge.css';

const STATUS_MAP = {
  idle:       { label: 'Prêt',            color: 'grey'   },
  requesting: { label: 'Accès micro…',    color: 'yellow' },
  recording:  { label: 'Enregistrement',  color: 'red'    },
  paused:     { label: 'En pause',        color: 'yellow' },
  stopped:    { label: 'Terminé',         color: 'green'  },
  error:      { label: 'Erreur',          color: 'red'    },
};

export default function StatusBadge({ status }) {
  const { label, color } = STATUS_MAP[status] || STATUS_MAP.idle;
  return (
    <span className={`sb-badge sb-badge--${color}`} aria-live="polite">
      {label}
    </span>
  );
}
