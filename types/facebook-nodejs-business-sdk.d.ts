declare module 'facebook-nodejs-business-sdk' {
  export class UserData {
    setClientIpAddress(ip: string): this
    setClientUserAgent(ua: string): this
    setFbc(fbc: string): this
    setFbp(fbp: string): this
  }

  export class CustomData {
    setContentName(name: string): this
    setContentIds(ids: string[]): this
    setContentCategory(category: string): this
    setValue(value: number): this
    setCurrency(currency: string): this
  }

  export class ServerEvent {
    setEventName(name: string): this
    setEventTime(time: number): this
    setEventSourceUrl(url: string): this
    setActionSource(source: string): this
    setUserData(userData: UserData): this
    setCustomData(customData: CustomData): this
  }

  export class EventRequest {
    constructor(accessToken: string, pixelId: string)
    setEvents(events: ServerEvent[]): this
    execute(): Promise<any>
  }
}
