"use client";

type Props = {
  open: boolean;
  onLocate: () => void;
  onSearch: () => void;
  onDismiss: () => void;
};

export default function WelcomeModal({ open, onLocate, onSearch, onDismiss }: Props) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
      <div className="modal-card">
        <div className="welcome-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/welcome-location.jpg" alt="Person using a transit map on a phone near a station" />
        </div>
        <div className="modal-body">
          <p className="kicker">Location, used carefully</p>
          <h2 id="welcome-title">Find the metro around you</h2>
          <p>
            Smart Metro Finder uses your location only to place you on the map and measure distance to nearby stations.
            Tracking stays off until you enable it. We do not store a location history.
          </p>
          <ul className="welcome-list">
            <li>GPS is requested in the browser and can be denied.</li>
            <li>You can type an address or tap the map instead.</li>
            <li>Live train arrivals are not invented. Official agency links are provided for disruptions.</li>
          </ul>
          <div className="details-actions">
            <button type="button" className="primary-btn" onClick={onLocate}>
              Use my location
            </button>
            <button type="button" className="secondary-btn" onClick={onSearch}>
              Search for a place
            </button>
            <button type="button" className="text-btn" onClick={onDismiss}>
              Continue without location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
