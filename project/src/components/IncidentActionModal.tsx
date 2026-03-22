type TransferTargetRole = 'secretary' | 'captain';

export function IncidentActionModal({
  open,
  mode,
  incidentLabel,
  selectedRole,
  onRoleChange,
  onCancel,
  onConfirm,
  isSubmitting,
}: {
  open: boolean;
  mode: 'resolve' | 'transfer';
  incidentLabel?: string;
  selectedRole: TransferTargetRole;
  onRoleChange: (role: TransferTargetRole) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}) {
  if (!open) {
    return null;
  }

  const isTransfer = mode === 'transfer';
  const title = isTransfer ? 'Transfer Incident' : 'Resolve Incident';
  const confirmLabel = isSubmitting ? 'Processing...' : isTransfer ? 'Transfer Incident' : 'Resolve Incident';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <p className="mt-2 text-sm text-gray-600">
            {isTransfer
              ? `Choose where to send ${incidentLabel ?? 'this incident'} after transfer.`
              : `Confirm that you want to mark ${incidentLabel ?? 'this incident'} as resolved.`}
          </p>
        </div>

        {isTransfer ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => onRoleChange('secretary')}
              className={
                selectedRole === 'secretary'
                  ? 'rounded-xl border border-blue-600 bg-blue-50 px-4 py-4 text-left shadow-sm'
                  : 'rounded-xl border border-gray-200 bg-white px-4 py-4 text-left hover:border-blue-300 hover:bg-blue-50/40'
              }
            >
              <div className="text-sm font-semibold text-gray-900">Secretary</div>
              <div className="mt-1 text-xs text-gray-500">Send this complaint to the secretary queue.</div>
            </button>
            <button
              type="button"
              onClick={() => onRoleChange('captain')}
              className={
                selectedRole === 'captain'
                  ? 'rounded-xl border border-emerald-600 bg-emerald-50 px-4 py-4 text-left shadow-sm'
                  : 'rounded-xl border border-gray-200 bg-white px-4 py-4 text-left hover:border-emerald-300 hover:bg-emerald-50/40'
              }
            >
              <div className="text-sm font-semibold text-gray-900">Captain</div>
              <div className="mt-1 text-xs text-gray-500">Send this complaint to the captain queue.</div>
            </button>
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className={
              isTransfer
                ? 'rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300'
                : 'rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300'
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}