import React from "react";
import { AlertTriangle, X } from "lucide-react";
import { T } from "../utils";

/**
 * ConfirmDialog
 * ─────────────
 * Composant de confirmation réutilisable pour intercepter les tentatives
 * de fermeture des modals. Affiche un avertissement et propose deux actions:
 * - Continuer l'édition (fermer le dialog)
 * - Fermer quand même (accepter la fermeture du modal parent)
 */
export default function ConfirmDialog({ onConfirm, onCancel, message }) {
  const msg = message || "Êtes-vous sûr ? Les changements non enregistrés seront perdus.";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 800,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 8,
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          width: "min(400px,95vw)",
          border: `1px solid rgba(55,53,47,0.13)`,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px 12px",
            borderBottom: `1px solid ${T.pageBdr}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: "rgba(212, 76, 71, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <AlertTriangle
                style={{ width: 16, height: 16, color: "#d44c47" }}
              />
            </div>
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: T.pageText,
                letterSpacing: "-0.02em",
              }}
            >
              Êtes-vous sûr ?
            </span>
          </div>
          <button
            onClick={onCancel}
            style={{
              width: 24,
              height: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 4,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: T.pageSub,
              flexShrink: 0,
            }}
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "16px 20px" }}>
          <p
            style={{
              fontSize: 13,
              color: T.pageSub,
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {msg}
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: `1px solid ${T.pageBdr}`,
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            background: "rgba(55,53,47,0.02)",
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "7px 14px",
              fontSize: 13,
              color: T.pageSub,
              background: "transparent",
              border: `1px solid rgba(55,53,47,0.2)`,
              borderRadius: 4,
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: 500,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(55,53,47,0.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            Continuer l'édition
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "7px 14px",
              fontSize: 13,
              fontWeight: 600,
              color: "#fff",
              background: "#d44c47",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#c1403a";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#d44c47";
            }}
          >
            Fermer quand même
          </button>
        </div>
      </div>
    </div>
  );
}
