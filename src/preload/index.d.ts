import { ElectronAPI } from '@electron-toolkit/preload'

// Los tipos de CatalogarApi y compañía están en api-types.d.ts
declare global {
  interface Window {
    electron: ElectronAPI
    api: CatalogarApi
  }
}