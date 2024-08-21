import { rum } from 'src/api'

interface Handler {
    /**
     * Enabled reports whether the handler handles records at the given level.
     * The handler ignores records whose level is lower.
     * It is called early, before any arguments are processed,
     * to save effort if the log event should be discarded.
     * If called from a Logger method, the first argument is the context
     * passed to that method, or context.Background() if nil was passed
     * or the method does not take a context.
     * The context is passed so Enabled can use its values
     * to make a decision.
     */
    Enabled(level: number): boolean

    /**
     * Handle handles the Record.
     * It will only be called when Enabled returns true.
     * The Context argument is as for Enabled.
     * It is present solely to provide Handlers access to the context's values.
     * Canceling the context should not affect record processing.
     * (Among other things, log messages may be necessary to debug a
     * cancellation-related problem.)
     *
     * Handle methods that produce output should observe the following rules:
     *   - If r.Time is the zero time, ignore the time.
     *   - If r.PC is zero, ignore it.
     *   - Attr's values should be resolved.
     *   - If an Attr's key and value are both the zero value, ignore the Attr.
     *     This can be tested with attr.Equal(Attr{}).
     *   - If a group's key is empty, inline the group's Attrs.
     *   - If a group has no Attrs (even if it has a non-empty key),
     *     ignore it.
     */
    Handle(attrs: Record<string, unknown>): void

    /**
     * WithAttrs returns a new Handler whose attributes consist of
     * both the receiver's attributes and the arguments.
     * The Handler owns the slice: it may retain, modify or discard it.
     */
    WithAttrs(attrs: Record<string, unknown>): Handler

    // // WithGroup returns a new Handler with the given group appended to
    // // the receiver's existing groups.
    // // The keys of all subsequent attributes, whether added by With or in a
    // // Record, should be qualified by the sequence of group names.
    // //
    // // How this qualification happens is up to the Handler, so long as
    // // this Handler's attribute keys differ from those of another Handler
    // // with a different sequence of group names.
    // //
    // // A Handler should treat WithGroup as starting a Group of Attrs that ends
    // // at the end of the log event. That is,
    // //
    // //     logger.WithGroup("s").LogAttrs(ctx, level, msg, slog.Int("a", 1), slog.Int("b", 2))
    // //
    // // should behave like
    // //
    // //     logger.LogAttrs(ctx, level, msg, slog.Group("s", slog.Int("a", 1), slog.Int("b", 2)))
    // //
    // // If the name is empty, WithGroup returns the receiver.
    // WithGroup(name: string): Handler
}

/**
 * TimeKey is the key used by the built-in handlers for the time
 * when the log method is called. The associated Value is a [time.Time].
 */
export const TimeKey = 'time'
/**
 * LevelKey is the key used by the built-in handlers for the level
 * of the log call. The associated value is a [Level].
 */
export const LevelKey = 'level'
/**
 * MessageKey is the key used by the built-in handlers for the
 * message of the log call. The associated value is a string.
 */
export const MessageKey = 'msg'
/**
 * SourceKey is the key used by the built-in handlers for the source file
 * and line of the log call. The associated value is a *[Source].
 */
export const SourceKey = 'source'

export const LevelDebug: number = -4
export const LevelInfo: number = 0
export const LevelWarn: number = 4
export const LevelError: number = 8

export class Logger {
    constructor(private readonly handler: Handler) {}

    private handle(
        message: string,
        level: number,
        attrs?: Record<string, unknown>,
    ) {
        if (!this.handler.Enabled(level)) {
            return
        }
        return this.handler.Handle({
            ...attrs,
            [LevelKey]: level,
            [MessageKey]: message,
            [TimeKey]: new Date(),
        })
    }

    public Error(message: string, attrs?: Record<string, unknown>) {
        return this.handle(message, LevelError, attrs)
    }
    public Warn(message: string, attrs?: Record<string, unknown>) {
        return this.handle(message, LevelWarn, attrs)
    }
    public Info(message: string, attrs?: Record<string, unknown>) {
        return this.handle(message, LevelInfo, attrs)
    }
    public Debug(message: string, attrs?: Record<string, unknown>) {
        return this.handle(message, LevelDebug, attrs)
    }

    public WithAttrs(attrs: Record<string, unknown>): Logger {
        return new Logger(this.handler.WithAttrs(attrs))
    }
}
export function levelString(level: number): string {
    const str = (base: string, val: number): string => {
        if (val == 0) {
            return base
        }
        if (val < 0) {
            return base + val
        }
        return base + '+' + val
    }

    switch (true) {
        case level < LevelInfo:
            return str('DEBUG', level - LevelDebug)
        case level < LevelWarn:
            return str('INFO', level - LevelInfo)
        case level < LevelError:
            return str('WARN', level - LevelWarn)
        default:
            return str('ERROR', level - LevelError)
    }
}

abstract class BaseHandler implements Handler {
    constructor(
        private readonly level: number = 0,
        private readonly attrs?: Record<string, unknown>,
    ) {}

    protected abstract handle(
        time: Date,
        level: number,
        message: string,
        attrs: Record<string, unknown>,
    ): void

    Enabled(level: number): boolean {
        return this.level <= level
    }
    Handle(attrs: Record<string, unknown>): void {
        const allAttrs = { ...this.attrs, ...attrs }
        const {
            [TimeKey]: time,
            [MessageKey]: message,
            [LevelKey]: levelUnknown,
            ...rest
        } = allAttrs
        const level = Number(levelUnknown)

        this.handle(new Date(String(time)), level, String(message), rest)
    }
    WithAttrs(attrs: Record<string, unknown>): Handler {
        return new ConsoleHandler(this.level, attrs)
    }
}
export class ConsoleHandler extends BaseHandler {
    protected handle(
        time: Date,
        level: number,
        message: string,
        attrs: Record<string, unknown>,
    ): void {
        const args: unknown[] = []
        if (time !== undefined) args.push(time)
        attrs[LevelKey] = levelString(level)

        if (message !== undefined) args.push(message)

        if (Object.keys(attrs).length > 0) args.push(attrs)

        if (level >= LevelError) {
            // eslint-disable-next-line no-console
            console.error(...args)
        } else if (level >= LevelWarn) {
            // eslint-disable-next-line no-console
            console.warn(...args)
        } else {
            // eslint-disable-next-line no-console
            console.log(...args)
        }
    }
}

export class FetchHandler extends BaseHandler {
    protected handle(
        _time: Date,
        level: number,
        message: string,
        attrs: Record<string, unknown>,
    ): void {
        for (const key of Object.keys(attrs)) {
            if (attrs[key] instanceof Date) {
                attrs[key] = attrs[key].toISOString()
            }
            if (attrs[key] instanceof Error) {
                attrs[key] = attrs[key].message
            }
        }

        rum.log({
            message: message,
            level: levelString(level),
            attrs: attrs,
        }).catch(e => {
            // eslint-disable-next-line no-console
            console.warn('rum log failed', e)
        })
    }
}

class MuxHandler implements Handler {
    constructor(private readonly handlers: Handler[]) {}
    Enabled(level: number): boolean {
        return !!this.handlers.find(h => h.Enabled(level))
    }
    Handle(attrs: Record<string, unknown>): void {
        const level = Number(attrs[LevelKey])
        for (const h of this.handlers) {
            if (h.Enabled(level)) {
                h.Handle(attrs)
            }
        }
    }
    WithAttrs(attrs: Record<string, unknown>): Handler {
        return new MuxHandler(this.handlers.map(h => h.WithAttrs(attrs)))
    }
}

const slog = new Logger(
    new MuxHandler([
        new FetchHandler(LevelWarn),
        new ConsoleHandler(LevelDebug),
    ]),
)

export default slog
