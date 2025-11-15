export type WebManifest = {
    /**
     * The background_color manifest member is used to specify an initial
     * background color for your web application. This color appears in the
     * application window before your application's stylesheets have loaded.
     */
    background_color?: string

    /**
     * The categories manifest member lets you specify one or more
     * classifications for your web application. These categories help users
     * discover your app in app stores.
     */
    categories?: string[]

    /**
     * The description manifest member is used to explain the core features or
     * functionality of your web application. This text helps users understand
     * your app's purpose when viewing it in an app store.
     */
    description?: string

    /**
     * The display manifest member is used to specify your preferred display
     * mode for the web application. The display mode determines how much of the
     * browser UI is shown to the user when the app is launched within the
     * context of an operating system. You can choose to show the full browser
     * interface or hide it to provide a more app-like experience.
     */
    display?: Display

    /**
     * The display member is used to determine the developer's preferred display
     * mode for a website. It follows a process where the browser falls back to
     * the next display mode if the requested one is not supported. In some
     * advanced use cases, this fallback process might not be enough.
     */
    display_override?: Display

    /**
     * The file_handlers member specifies an array of objects representing the
     * types of files an installed progressive web app (PWA) can handle.
     */
    file_handlers?: FileHandler[]

    /**
     * The icons manifest member is used to specify one or more image files that
     * define the icons to represent your web application.
     */
    icons?: Icon[]

    /**
     * The id manifest member is used to specify a unique identifier for your
     * web application.
     */
    id?: string

    /**
     * The launch_handler member defines values that control the launch of a web
     * application. Currently it can only contain a single value, client_mode,
     * which specifies the context in which the app should be loaded when
     * launched. For example, in an existing web app client containing an
     * instance of the app, or in a new web app client. This leaves scope for
     * more launch_handler values to be defined in the future.
     */
    launch_handler?: LaunchHandler

    /**
     * The name manifest member is used to specify the full name of your web
     * application as it's usually displayed to users, such as in application
     * lists or as a label for your application's icon.
     */
    name?: string

    /**
     * The note_taking member identifies a web app as a note-taking app and
     * defines related information, for example a URL pointing to functionality
     * for taking a new note. This enables operating systems to integrate the
     * app's note taking functionality, for example including a "New note"
     * option in the app's context menu, or providing the app as an option for
     * taking a note in other apps.
     */
    note_taking?: NoteTaking

    /**
     * The orientation manifest member is used to specify the default
     * orientation for your web application. It defines how the app should be
     * displayed when launched and during use, in relation to the device's
     * screen orientation, particularly on devices that support multiple
     * orientations.
     */
    orientation?: Orientation

    /**
     * The prefer_related_applications manifest member is used to provide a hint
     * to browsers whether to prefer installing native applications specified in
     * the related_applications manifest member over your web application.
     */
    prefer_related_applications?: boolean

    /**
     * The protocol_handlers member specifies an array of objects that are
     * protocols which this web app can register and handle. Protocol handlers
     * register the application in an OS's application preferences; the
     * registration associates a specific application with the given protocol
     * scheme. For example, when using the protocol handler mailto:// on a web
     * page, registered email applications open.
     */
    protocol_handlers?: ProtocolHandler[]

    /**
     * The related_applications manifest member is used to specify one or more
     * applications that are related to your web application. These may be
     * platform-specific applications or Progressive Web Apps.
     */
    related_applications?: RelatedApplication[]

    /**
     * The scope manifest member is used to specify the top-level URL path that
     * contains your web application's pages and subdirectories. When users
     * install and use your web app, pages within scope provide an app-like
     * interface. When users navigate to pages outside the app's scope, they
     * still experience the app-like interface, but browsers display UI elements
     * like the URL bar to indicate the change in context.
     */
    scope?: string

    /**
     * The scope_extensions manifest member is used to extend the scope of a web
     * app to include other origins. This allows multiple domains to be
     * presented as a single web app.
     */
    scope_extensions?: ScopeExtension[]

    /**
     * The screenshots manifest member lets you specify one or more images that
     * showcase your web application. These images help users preview your web
     * app's interface and features in app stores.
     */
    screenshots?: Screenshot[]

    /**
     * The serviceworker member specifies a serviceworker that is Just-In-Time
     * (JIT)-installed and registered to run a web-based payment app providing a
     * payment mechanism for a specified payment method in a merchant website.
     * See Payment Handler API for more details.
     */
    serviceworker?: ServiceWorker

    /**
     * The share_target manifest member allows installed Progressive Web Apps
     * (PWAs) to be registered as a share target in the system's share dialog.
     */
    share_target?: ShareTarget

    /**
     * The short_name manifest member is used to specify a short name for your
     * web application, which may be used when the full name is too long for the
     * available space.
     */
    short_name?: string

    /**
     * The shortcuts manifest member is used to specify links to key tasks or
     * pages within your web application. Browsers can use this information to
     * create a context menu, which is typically displayed when a user interacts
     * with the web app's icon.
     */
    shortcuts?: Shortcut[]

    /**
     * The start_url manifest member is used to specify the URL that should be
     * opened when a user launches your web application, such as when tapping
     * the application's icon on their device's home screen or in an application
     * list.
     */
    start_url?: string

    /**
     * The theme_color member is used to specify the default color for your web
     * application's user interface. This color may be applied to various
     * browser UI elements, such as the toolbar, address bar, and status bar. It
     * can be particularly noticeable in contexts like the task switcher or when
     * the app is added to the home screen.
     */
    theme_color?: string
}

export type Display = 'fullscreen' | 'standalone' | 'minimal-ui' | 'browser'

export type FileHandler = {
    /**
     * A string containing the URL to navigate to when a file is handled. This
     * URL must be within the navigation scope of the PWA, which is the set of
     * URLs that the PWA can navigate to. The navigation scope of a PWA defaults
     * to its start_url member, but can also be defined by using the scope
     * member.
     */
    action: string
    /**
     * An object. For each property in the object:
     * - The property key is a MIME type.
     * - The property value is an array of strings representing file extensions
     *   associated with that MIME type.
     */
    accept: Record<string, string[]>
}

export type LaunchHandler = {
    client_mode: ClientMode
}
/**
 * A string, or comma-separated array of strings, which specifies the context in
 * which the app should be loaded when launched. If an array of strings is
 * provided, the first valid value is used. Possible values are:
 *
 * > `auto`
 * > > The user agent decides what context makes sense for the platform to load
 * > > the app in. For example, navigate-existing might make more sense on
 * > > mobile, where single app instances are commonplace, whereas navigate-new
 * > > might make more sense in a desktop context. This is the default value
 * > > used if all the provided values are invalid.
 * >
 * > `focus-existing`
 * > > If the app is already loaded in a web app client, it is brought into
 * > > focus but not navigated to the launch target URL. The target URL is made
 * > > available via Window.launchQueue to allow custom launch navigation
 * > > handling to be implemented. If the app is not already loaded in a web app
 * > > client, navigate-new behavior is used instead.
 * >
 * > `navigate-existing`
 * > > If the app is already loaded in a web app client, it is brought into
 * > > focus and navigated to the specified launch target URL. The target URL is
 * > > made available via Window.launchQueue to allow additional custom launch
 * > > navigation handling to be implemented. If the app is not already loaded
 * > > in a web app client, navigate-new behavior is used instead.
 * >
 * > `navigate-new`
 * > > The app is loaded inside a new web app client. The target URL is made
 * > > available via Window.launchQueue to allow additional custom launch
 * > > navigation handling to be implemented.
 */
export type ClientMode =
    | 'auto'
    | 'focus-existing'
    | 'navigate-existing'
    | 'navigate-new'

export type Icon = {
    src: string
    sizes?: string
    type?: string
    purpose?: string
}

export type NoteTaking = {
    /**
     * A string representing the URL the developer would prefer the user agent
     * to load when the user wants to take a new note via the web app. This
     * value is a hint, and different implementations may choose to ignore it or
     * provide it as a choice in appropriate places. The new_note_url is parsed
     * with the app's manifest URL as its base URL and is ignored if not within
     * the scope of the manifest.
     */
    new_note_url: string
}

/**
 * A string that specifies the default orientation for the web app. If the
 * orientation member is not specified or an invalid value is provided, the web
 * app will typically use the device's natural orientation and any user or
 * system-level orientation settings.
 *
 * The orientation value must be one of the following keywords:
 *
 * > `any`
 * > > Displays the web app in any orientation allowed by the device's operating
 * > > system or user settings. It allows the app to rotate freely to match the
 * > > orientation of the device when it is rotated.
 * >
 * > `natural`
 * > > Displays the web app in the orientation considered most natural for the
 * > > device, as determined by the browser, operating system, user settings, or
 * > > the screen itself. It corresponds to how the device is most commonly held
 * > > or used:
 * > >
 * > > - On devices typically held vertically, such as mobile phones, natural is
 * > >   usually portrait-primary.
 * > > - On devices typically used horizontally, such as computer monitors and
 * > >   tablets, natural is usually landscape-primary.
 * > >
 * > > When the device is rotated, the app may or may not rotate so as to match
 * > > the device's natural orientation; this behavior may vary depending on the
 * > > specific device, browser implementation, and user settings.
 * >
 * > `portrait`
 * > > Displays the web app with height greater than width. It allows the app to
 * > > switch between portrait-primary and portrait-secondary orientations when
 * > > the device is rotated.
 * >
 * > `portrait-primary`
 * > > Displays the web app in portrait mode, typically with the device held
 * > > upright. This is usually the default app orientation on devices that are
 * > > naturally portrait. Depending on the device and browser implementation,
 * > > the app will typically maintain this orientation even when the device is
 * > > rotated.
 * >
 * > `portrait-secondary`
 * > > Displays the web app in inverted portrait mode, which is portrait-primary
 * > > rotated 180 degrees. Depending on the device and browser implementation,
 * > > the app will typically maintain this orientation even when the device is
 * > > rotated.
 * >
 * > `landscape`
 * > > Displays the web app with width greater than height. It allows the app to
 * > > switch between landscape-primary and landscape-secondary orientations
 * > > when the device is rotated.
 * >
 * > `landscape-primary`
 * > > Displays the web app in landscape mode, typically with the device held in
 * > > its standard horizontal position. This is usually the default app
 * > > orientation on devices that are naturally landscape. Depending on the
 * > > device and browser implementation, the app will typically maintain this
 * > > orientation even when the device is rotated.
 * >
 * > `landscape-secondary`
 * > > Displays the web app in inverted landscape mode, which is
 * > > landscape-primary rotated 180 degrees. Depending on the device and
 * > > browser implementation, the app will typically maintain this orientation
 * > > even when the device is rotated.
 */
export type Orientation =
    | 'any'
    | 'natural'
    | 'portrait'
    | 'portrait-primary'
    | 'portrait-secondary'
    | 'landscape'
    | 'landscape-primary'
    | 'landscape-secondary'

export type ProtocolHandler = {
    /**
     * A required string containing the protocol to be handled; e.g.: mailto,
     * ms-word, web+jngl.
     *
     * @experimental
     */
    protocol: string

    /**
     * Required HTTPS URL within the application scope that will handle the
     * protocol. The %s token will be replaced by the URL starting with the protocol
     * handler's scheme. If url is a relative URL, the base URL will be the URL of
     * the manifest.
     *
     * @experimental
     */
    url: string
}

export type RelatedApplication = {
    /**
     * A string that identifies the platform on which the application can be
     * found. Examples include amazon (Amazon App Store), play (Google Play
     * Store), windows (Windows Store), and webapp (for Progressive Web Apps).
     * See the complete list of possible platform values.
     */
    platform: string

    /**
     * A string that represents the URL at which the platform-specific
     * application can be found. If not specified, an id must be provided.
     */
    url?: string

    /**
     * A string with the ID used to represent the application on the specified
     * platform. If not specified, a url must be provided.
     */
    id?: string
}

export type ScopeExtension = {
    type: 'origin'
    origin: string
}

export type Screenshot = {
    /**
     * A string that specifies the path to the image file. It has the same
     * format as the icons member's src property.
     */
    src: string

    /**
     * A string that specifies one or more sizes of the image. It has the same
     * format as the icons member's sizes property.
     */
    sizes?: string

    /**
     * A string that specifies the MIME type of the image. It has the same
     * format as the icons member's type property.
     */
    type?: string

    /**
     * A string that represents the accessible name of the screenshot object.
     * Keep it descriptive because it can serve as alternative text for the
     * rendered screenshot. For accessibility, it is recommended to specify this
     * property for every screenshot.
     */
    label?: string

    /**
     * A string that represents the screen shape of a broad class of devices to
     * which the screenshot applies. Specify this property only when the screenshot
     * applies to a specific screen layout. If form_factor is not specified, the
     * screenshot is considered suitable for all screen types.
     *
     * Valid values include:
     *
     * > `narrow`
     * > > Indicates that the screenshot is applicable only to narrow screens, such as mobile devices.
     * >
     * > `wide`
     * > > Indicates that the screenshot is applicable only to wide screens, such as desktop computers.
     */
    form_factor?: FormFactor

    /**
     * A string that represents the platform to which the screenshot applies.
     * Specify this property only when the screenshot applies to a specific device
     * or distribution platform. If platform is not specified, the screenshot is
     * considered suitable for all platforms.
     *
     * | Type                   | Value              | Description                          |
     * | ---------------------- | ------------------ | ------------------------------------ |
     * | Operating systems      | `android`          | Google Android                       |
     * |                        | `chromeos`         | Google ChromeOS                      |
     * |                        | `ios`              | Apple iOS                            |
     * |                        | `ipados`           | Apple iPadOS                         |
     * |                        | `kaios`            | KaiOS                                |
     * |                        | `macos`            | Apple macOS                          |
     * |                        | `windows`          | Microsoft Windows                    |
     * |                        | `xbox`             | Microsoft Xbox                       |
     * | Distribution platforms | `chrome_web_store` | Google Chrome Web Store              |
     * |                        | `itunes`           | iTunes App Store                     |
     * |                        | `microsoft-inbox`  | Pre-installed with Microsoft Windows |
     * |                        | `microsoft-store`  | Microsoft Store                      |
     * |                        | `play`             | Google Play Store                    |
     */
    platform?: Platform
}

export type FormFactor = 'narrow' | 'wide'

export type Platform =
    | 'android'
    | 'chromeos'
    | 'ios'
    | 'ipados'
    | 'kaios'
    | 'macos'
    | 'windows'
    | 'xbox'
    | 'chrome_web_store'
    | 'itunes'
    | 'microsoft-inbox'
    | 'microsoft-store'
    | 'play'

export type ServiceWorker = {
    /**
     * A string representing the service worker's registration scope.
     * @experimental Non-standard
     */
    scope: string

    /**
     * A string representing the URL to download the service worker script from.
     * @experimental Non-standard
     */
    src: string

    /**
     * A boolean that sets how the HTTP cache is used for service worker script
     * resources during updates. It provides equivalent functionality to certain
     * values of the updateViaCache option provided when a service worker is
     * registered via JavaScript using ServiceWorkerContainer.register().
     *
     * - `true`: The HTTP cache will be queried for imports, but the main script
     *   will always be updated from the network. If no fresh entry is found in
     *   the HTTP cache for the imports, they're fetched from the network.
     *   Equivalent to updateViaCache: "imports".
     * - `false`: The HTTP cache will not be used for the main script or its
     *   imports. All service worker script resources will be updated from the
     *   network. Equivalent to updateViaCache: "none".
     *
     * @experimental Non-standard
     */
    use_cache: boolean
}

export type ShareTarget = {
    /**
     * The URL for the web share target.
     */
    action: string

    /**
     * The encoding of the share data when a POST request is used. Ignored with
     * GET requests.
     */
    enctype?: string

    /**
     * The HTTP request method to use. Either GET or POST. Use POST if the
     * shared data includes binary data like image(s), or if it changes the
     * target app, for example, if it creates a data point like a bookmark.
     */
    method?: string

    /**
     * An object to configure the share parameters. The object keys correspond
     * to the data object in navigator.share(). The object values can be
     * specified and will be used as query parameters:
     */
    params: ShareTargetParams
}

export type ShareTargetParams = {
    /**
     * Name of the query parameter to use for the title of the document being
     * shared.
     */
    title?: string

    /**
     * Name of the query parameter for the text (or body) of the message being
     * shared.
     */
    text?: string

    /**
     * Name of the query parameter for the URL to the resource being shared.
     */
    url?: string

    /**
     * An object (or an array of objects) defining which files
     */
    files: ShareTargetFile
}

export type ShareTargetFile = {
    /**
     * Name of the form field used to share files.
     */
    name: string
    /**
     * A string (or an array of strings) of accepted MIME types or file
     * extensions.
     */
    accept: string
}

export type Shortcut = {
    /**
     * A string that represents the name of the shortcut, which is displayed to
     * users in a context menu.
     */
    name: string

    /**
     * A string that represents a short version of the shortcut's name. Browsers
     * may use this in contexts where there isn't enough space to display the
     * full name.
     */
    short_name?: string

    /**
     * A string that describes the purpose of the shortcut. Browsers may expose
     * this information to assistive technology, such as screen readers, which
     * can help users understand the purpose of the shortcut.
     */
    description?: string

    /**
     * An app URL that opens when the associated shortcut is activated. The URL
     * must be within the scope of the web app manifest. If the value is
     * absolute, it should be same-origin with the page that links to the
     * manifest file. If the value is relative, it is resolved against the
     * manifest file's URL.
     */
    url: string

    /**
     * An array of icon objects representing the shortcut in various contexts. This has the same format as the icons manifest member.
     */
    icons?: Icon[]
}
