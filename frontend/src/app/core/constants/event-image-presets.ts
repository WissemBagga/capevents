export interface EventImagePreset {
  category: string;
  label: string;
  url: string;
}

export const EVENT_IMAGE_PRESETS: EventImagePreset[] = [
  { category: 'Formation', label: 'Formation', url: '../../../../public/images/events/Formation.jpg' },
  { category: 'Team building', label: 'Team building', url: '../../../../public/images/events/Team building.jpg' },
  { category: 'Conférence', label: 'Conférence', url: '../../../../public/images/events/Conférence.jpg' },
  { category: 'Atelier', label: 'Atelier', url: '../../../../public/images/events/Atelier.jpg' },
  { category: 'Webinaire', label: 'Webinaire', url: '../../../../public/images/events/Webinaire.jpg' },
  { category: 'Afterwork', label: 'Afterwork', url: '../../../../public/images/events/Afterwork.jpg' },
  { category: 'Bien-être', label: 'Bien-être', url: '../../../../public/images/events/Bien-être.jpg' },
  { category: 'Sport', label: 'Sport', url: '../../../../public/images/events/Sport.jpg' },
  { category: 'RSE', label: 'RSE', url: '../../../../public/images/events/RSE.jpg' },
  { category: 'Networking', label: 'Sport', url: '../../../../public/images/events/Networking.jpg' },
  { category: 'Culture d’entreprise', label: 'Culture d’entreprise', url: '../../../../public/images/events/Culture d’entreprise.jpg' },
  { category: 'Innovation', label: 'Innovation', url: '../../../../public/images/events/Innovation.jpg' }
];


export function getDefaultEventImage(category: string | null | undefined): string {
  const match = EVENT_IMAGE_PRESETS.find(item => item.category === category);
  return match?.url ?? '../../../../public/images/events/autre.jpg';
}