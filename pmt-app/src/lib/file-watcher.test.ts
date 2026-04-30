import { describe, it, expect } from 'vitest';
import { detectCloudService } from './file-watcher';

describe('detectCloudService', () => {
  it('should detect Dropbox', () => {
    expect(detectCloudService('/Users/John/Dropbox/Workspace')).toBe('Dropbox');
    expect(detectCloudService('C:\\Users\\John\\dropbox\\Workspace')).toBe('Dropbox');
  });

  it('should detect OneDrive', () => {
    expect(detectCloudService('/Users/John/OneDrive/Workspace')).toBe('OneDrive');
    expect(detectCloudService('C:\\Users\\John\\onedrive\\Workspace')).toBe('OneDrive');
  });

  it('should detect Google Drive', () => {
    expect(detectCloudService('/Users/John/Google Drive/Workspace')).toBe('Google Drive');
    expect(detectCloudService('C:\\Users\\John\\GoogleDrive\\Workspace')).toBe('Google Drive');
    expect(detectCloudService('/Users/John/google drive/Workspace')).toBe('Google Drive');
    expect(detectCloudService('/Users/John/googledrive/Workspace')).toBe('Google Drive');
  });

  it('should return null when no cloud service is detected', () => {
    expect(detectCloudService('/Users/John/Documents/Workspace')).toBeNull();
    expect(detectCloudService('C:\\Users\\John\\Documents\\Workspace')).toBeNull();
    expect(detectCloudService('')).toBeNull();
    expect(detectCloudService('   ')).toBeNull();
  });

  it('should handle paths with multiple cloud services based on precedence', () => {
    // Dropbox is checked first
    expect(detectCloudService('/Users/John/Dropbox/OneDrive_Backup/')).toBe('Dropbox');

    // OneDrive is checked second
    expect(detectCloudService('/Users/John/OneDrive/Google Drive_Backup/')).toBe('OneDrive');
  });
});
