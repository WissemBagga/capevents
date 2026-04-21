export interface EventImagePreset {
  category: string;
  label: string;
  url: string;
}

export const EVENT_IMAGE_PRESETS: EventImagePreset[] = [
  { category: 'Formation', label: 'Formation', url: 'images/events/formation.jpg' },
  { category: 'Team building', label: 'Team building', url: 'images/events/team-building.jpg' },
  { category: 'Conférence', label: 'Conférence', url: 'images/events/conference.jpg' },
  { category: 'Atelier', label: 'Atelier', url: 'images/events/atelier.jpg' },
  { category: 'Webinaire', label: 'Webinaire', url: 'images/events/webinaire.jpg' },
  { category: 'Afterwork', label: 'Afterwork', url: 'images/events/afterwork.jpg' },
  { category: 'Bien-être', label: 'Bien-être', url: 'images/events/bien-etre.jpg' },
  { category: 'Sport', label: 'Sport', url: 'images/events/Sport.jpg' },
  { category: 'RSE', label: 'RSE', url: 'images/events/rse.jpg' },
  { category: 'Networking', label: 'Networking', url: 'images/events/networking.jpg' },
  { category: 'Culture d’entreprise', label: 'Culture d’entreprise', url: 'images/events/culture-dentreprise.jpg' },
  { category: 'Innovation', label: 'Innovation', url: 'images/events/innovation.jpg' },
  { category: 'Team Lease Regtech', label: 'Innovation', url: 'images/events/team-Lease-Regtech.jpg' }
];


export function getDefaultEventImage(category: string | null | undefined): string {
  const match = EVENT_IMAGE_PRESETS.find(item => item.category === category);
  return match?.url ?? 'images/events/autre.jpg';
}
