import type { MainSettings } from '@server/lib/settings';
import { getSettings } from '@server/lib/settings';

class RestartFlag {
  private settings: MainSettings;

  public initializeSettings(settings: MainSettings): void {
    this.settings = { ...settings };
  }

  public isSet(): boolean {
    // FIX: Add a check to ensure this.settings is not undefined
    if (!this.settings) {
      return false;
    }

    const settings = getSettings().main;

    return (
      this.settings.csrfProtection !== settings.csrfProtection ||
      this.settings.trustProxy !== settings.trustProxy
    );
  }
}

const restartFlag = new RestartFlag();

export default restartFlag;
