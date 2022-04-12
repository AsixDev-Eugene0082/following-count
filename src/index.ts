import { igApi as IgApi, getSessionId as getIgSessionId } from "insta-fetcher"
import axios from "axios"
import { getChannelInfo } from "yt-channel-info"
import { BrowserContext } from "playwright-core"
import { getYoutubeChannelId } from "./utils"
import {
  getTwitterFollowerCountWithBrowser,
  getTwitterFollowerCountWithEmbedApi,
} from "./twitter"

export type Options =
  | {
      type: "instagram"
      username: string
      auth: {
        username: string
        password: string
      }
    }
  | {
      type: "youtube"
      /** Channel ID or channel URL (https://www.youtube.com/c/CHANNEL_ID) */
      channel: string
    }
  | {
      type: "tiktok"
      username: string
    }
  | {
      type: "twitter"
      username: string
      /**
       * A playwright chromium browser context
       * @example
       * ```js
       * import { getBrowserContext, destroyBrowser } from "follower-count"
       * await getFollowerCount({
       *   type: "twitter",
       *   username: "cristiano",
       *   browserContext: getBrowserContext({ chromiumPath: "/path/to/chromium" }),
       * })
       * await destroyBrowser()
       * ```
       */
      browserContext?: BrowserContext
    }

const USER_AGENT = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36`

export const getFollowerCount = async (options: Options): Promise<number> => {
  if (options.type === "instagram") {
    return getInstagramFollowerCount(options.username, options.auth)
  }

  if (options.type === "youtube") {
    return getYoutubeFollowerCount(options.channel)
  }

  if (options.type === "tiktok") {
    return getTikTokFollowerCount(options.username)
  }

  if (options.type === "twitter") {
    return options.browserContext
      ? getTwitterFollowerCountWithBrowser(
          options.username,
          options.browserContext,
        )
      : getTwitterFollowerCountWithEmbedApi(options.username)
  }

  throw new Error(`Unknown type: ${(options as any).type}`)
}

export async function getInstagramFollowerCount(
  username: string,
  auth: { username: string; password: string },
) {
  const sessionId = await getIgSessionId(auth.username, auth.password)
  const ig = new IgApi(sessionId)
  const user = await ig.fetchUser(username)
  return user.followers
}

export async function getYoutubeFollowerCount(channel: string) {
  const info = await getChannelInfo({
    channelId: getYoutubeChannelId(channel),
  })
  // Not sure why subscriberCount might be a float
  return Math.floor(info.subscriberCount)
}

export async function getTikTokFollowerCount(username: string) {
  const { data } = await axios(`https://www.tiktok.com/@${username}`, {
    responseType: "text",
    headers: {
      // TikTok requires a user-agent, otherwise it will return an empty string
      "user-agent": USER_AGENT,
    },
  })

  const m = /"authorStats":{"followerCount":(\d+),/.exec(data)

  return m ? parseInt(m[1]) : 0
}

export * from "./browser"
