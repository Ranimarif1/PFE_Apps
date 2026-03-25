import '../styles/ConnectionBanner.css';

export default function ConnectionBanner({ connected }) {
  if (connected) return null;
  return (
    <div className="cb-banner" role="status">
      Reconnexion au serveur en cours…
    </div>
  );
}
