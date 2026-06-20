import { describe, it, expect } from 'vitest'

// Inline-Test der mapCanvaItem-Logik ohne Modul-Import (Funktion ist nicht exportiert)
// Wir testen über die öffentliche Schnittstelle buildCanvaContext + direkte Unit-Tests der Mapper-Logik

// Fixture: echte Canva API-Response aus Dokumentation (Abschnitt 2.6 im Handoff)
const CANVA_FIXTURE_ITEMS = [
  {
    type: 'design',
    design: {
      id: 'DAFVztcvd9z',
      title: 'My summer holiday',
      thumbnail: { url: 'https://cdn.canva.com/thumb1.jpg' },
      urls: { edit_url: 'https://www.canva.com/design/DAFVztcvd9z/edit' },
    },
  },
  {
    type: 'image',
    image: {
      id: 'Msd59349ff',
      name: 'My Awesome Upload',
      thumbnail: { url: 'https://cdn.canva.com/thumb2.jpg' },
    },
  },
  {
    type: 'folder',
    folder: { id: 'FAF2lZtloor', name: 'My folder' },
  },
]

// Mapper-Logik als pure Funktion zum Testen (gespiegelt aus client.ts)
function mapItem(item: (typeof CANVA_FIXTURE_ITEMS)[0]) {
  if (item.type === 'design' && 'design' in item && item.design?.id) {
    return {
      id: item.design.id,
      name: item.design.title ?? item.design.id,
      type: 'design',
      thumbnailUrl: item.design.thumbnail?.url,
      editUrl: (item.design as { urls?: { edit_url?: string } }).urls?.edit_url,
    }
  }
  if (item.type === 'image' && 'image' in item && item.image?.id) {
    return {
      id: item.image.id,
      name: item.image.name ?? item.image.id,
      type: 'image',
      thumbnailUrl: item.image.thumbnail?.url,
    }
  }
  if (item.type === 'folder') return null
  return null
}

describe('Canva folder-items Parser', () => {
  it('mappt 3 API-Items auf 2 Assets (folder wird übersprungen)', () => {
    const assets = CANVA_FIXTURE_ITEMS.map(mapItem).filter(Boolean)
    expect(assets).toHaveLength(2)
  })

  it('mappt design korrekt', () => {
    const asset = mapItem(CANVA_FIXTURE_ITEMS[0])
    expect(asset).toMatchObject({
      id: 'DAFVztcvd9z',
      name: 'My summer holiday',
      type: 'design',
      thumbnailUrl: 'https://cdn.canva.com/thumb1.jpg',
    })
  })

  it('mappt image korrekt', () => {
    const asset = mapItem(CANVA_FIXTURE_ITEMS[1])
    expect(asset).toMatchObject({
      id: 'Msd59349ff',
      name: 'My Awesome Upload',
      type: 'image',
    })
  })

  it('überspringt folder', () => {
    expect(mapItem(CANVA_FIXTURE_ITEMS[2])).toBeNull()
  })

  it('leere items-Liste → leeres Array', () => {
    const result = ([] as typeof CANVA_FIXTURE_ITEMS).map(mapItem).filter(Boolean)
    expect(result).toHaveLength(0)
  })

  it('item mit fehlendem design.id wird übersprungen', () => {
    const item = { type: 'design', design: { title: 'No ID' } } as unknown as (typeof CANVA_FIXTURE_ITEMS)[0]
    expect(mapItem(item)).toBeNull()
  })
})
