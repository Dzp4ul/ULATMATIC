export const recordIncidentView = async (incidentId: number, userId: number, userRole: string) => {
  try {
    const response = await fetch('/api/incidents/record-view.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incident_id: incidentId,
        user_id: userId,
        user_role: userRole,
      }),
    });

    if (!response.ok) {
      console.error('Failed to record view');
      return false;
    }

    const data = await response.json();
    return data.ok === true;
  } catch (err) {
    console.error('Error recording view:', err);
    return false;
  }
};
