export type AdminDashboardMetric = {
  label: string;
  value: string;
  delta: string;
};

export type AdminDashboardActivity = {
  id: number;
  title: string;
  detail: string;
  time: string;
};

export type AdminDashboardChartSeries = {
  label: string;
  value: number;
};

const dashboardMetrics: AdminDashboardMetric[] = [
  { label: 'Total Books', value: '52,104', delta: '+4.8%' },
  { label: 'Available Books', value: '38,642', delta: '+3.1%' },
  { label: 'Issued Books', value: '7,980', delta: '+1.8%' },
  { label: 'Visitors Today', value: '546', delta: '+13%' },
];

const dashboardActivities: AdminDashboardActivity[] = [
  { id: 1, title: 'New book added', detail: 'Advanced Database Systems entered the catalog.', time: '2 hours ago' },
  { id: 2, title: 'Reservation approved', detail: 'A reserved copy was released to a faculty member.', time: '4 hours ago' },
  { id: 3, title: 'Fine paid', detail: 'Overdue fine settled for a returned book.', time: '5 hours ago' },
];

const visitorSeries: AdminDashboardChartSeries[] = [
  { label: 'Mon', value: 42 },
  { label: 'Tue', value: 60 },
  { label: 'Wed', value: 48 },
  { label: 'Thu', value: 80 },
  { label: 'Fri', value: 66 },
  { label: 'Sat', value: 92 },
  { label: 'Sun', value: 76 },
];

export const adminDashboardService = {
  getMetrics: () => dashboardMetrics,
  getRecentActivity: () => dashboardActivities,
  getVisitorSeries: () => visitorSeries,
};