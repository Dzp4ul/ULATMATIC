import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { IncidentMonthlyDatum } from '../utils/incidentAnalytics';

type IncidentStatusDatum = {
  name: string;
  value: number;
  color: string;
};

export function IncidentStatsCharts({
  loading,
  monthlyData,
  statusData,
}: {
  loading: boolean;
  monthlyData: IncidentMonthlyDatum[];
  statusData: IncidentStatusDatum[];
}) {
  const hasMonthlyData = monthlyData.some((item) => item.submitted > 0 || item.resolved > 0 || item.transferred > 0);
  const hasStatusData = statusData.some((item) => item.value > 0);

  return (
    <section className="mt-6 grid gap-4 xl:grid-cols-2">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-1 text-sm font-semibold text-gray-900">Incident Activity by Month</div>
        <p className="mb-3 text-xs text-gray-500">Submitted, resolved, and transferred incidents for {new Date().getFullYear()}</p>
        {loading ? (
          <div className="flex h-56 items-center justify-center text-sm text-gray-400">Loading...</div>
        ) : !hasMonthlyData ? (
          <div className="flex h-56 items-center justify-center text-sm text-gray-400">No incident activity yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={224}>
            <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="submitted" name="Submitted" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="transferred" name="Transferred" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-1 text-sm font-semibold text-gray-900">Incident Status Breakdown</div>
        <p className="mb-3 text-xs text-gray-500">Current distribution of incident records</p>
        {loading ? (
          <div className="flex h-56 items-center justify-center text-sm text-gray-400">Loading...</div>
        ) : !hasStatusData ? (
          <div className="flex h-56 items-center justify-center text-sm text-gray-400">No incident data available</div>
        ) : (
          <ResponsiveContainer width="100%" height={224}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={42}
                paddingAngle={3}
                dataKey="value"
                nameKey="name"
              >
                {statusData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}