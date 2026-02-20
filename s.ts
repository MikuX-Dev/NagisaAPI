const res = await fetch(
  'http://nagisa-api.1anime.app/api/utils/schema-update',
  { method: 'POST' },
)

if (res.ok) {
  console.log(await res.json())
} else {
  console.log(await res.text())
}
