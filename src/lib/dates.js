export function formatDate(date) {
	return new Intl.DateTimeFormat('en-DE').format(date)
}
