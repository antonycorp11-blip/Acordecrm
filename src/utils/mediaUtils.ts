/**
 * Utilitários para tratamento e streaming de mídias (áudio, vídeo, imagens)
 * Compatível com Google Drive, Supabase Storage e URLs diretas
 */

export function getMediaStreamUrl(url: string | undefined | null): string {
  if (!url) return '';
  
  // Se já for uma URL direta ou blob local
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }

  // Se for um link do Google Drive
  if (url.includes('drive.google.com')) {
    // Extrai o ID do arquivo (formatos: /file/d/ID/view, /open?id=ID, uc?id=ID)
    const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      const fileId = fileIdMatch[1];
      // URL direta de download/stream do Google Drive
      return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
  }

  return url;
}

export function getGoogleDrivePreviewUrl(url: string | undefined | null): string {
  if (!url) return '';
  if (url.includes('drive.google.com')) {
    const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
    }
  }
  return url;
}
