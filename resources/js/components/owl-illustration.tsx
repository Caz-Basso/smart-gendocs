import type { ReactNode, SVGProps } from 'react';

export type OwlVariant =
    | 'all-clear'
    | 'empty'
    | 'no-results'
    | 'not-found'
    | 'error'
    | 'forbidden'
    | 'waiting'
    | 'success';

type Face = {
    brows: ReactNode;
    eyes: ReactNode;
    mouth: ReactNode;
    cheeks?: boolean;
    glasses?: ReactNode;
    accessory?: ReactNode;
};

const dot = (cx: number, cy: number, r = 1.2) => (
    <circle cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />
);

const BROWS = {
    calm: (
        <>
            <path d="M33 37 Q43 30 54 36" />
            <path d="M66 36 Q77 30 87 37" />
        </>
    ),
    raised: (
        <>
            <path d="M33 33 Q43 24 54 31" />
            <path d="M66 31 Q77 24 87 33" />
        </>
    ),
    worried: (
        <>
            <path d="M34 31 Q44 30 54 38" />
            <path d="M66 38 Q76 30 86 31" />
        </>
    ),
    grumpy: (
        <>
            <path d="M34 38 Q44 36 54 41" />
            <path d="M66 41 Q76 36 86 38" />
        </>
    ),
};

const pupils = (dx: number, dy: number) => (
    <>
        <circle cx={44 + dx} cy={58 + dy} r="4" />
        <circle cx={76 + dx} cy={58 + dy} r="4" />
        {dot(45.5 + dx, 56.5 + dy)}
        {dot(77.5 + dx, 56.5 + dy)}
    </>
);

const EYES = {
    happy: (
        <>
            <path d="M37 60 Q44 52 51 60" />
            <path d="M69 60 Q76 52 83 60" />
        </>
    ),
    sleepy: (
        <>
            <path d="M37 57 Q44 64 51 57" />
            <path d="M69 57 Q76 64 83 57" />
        </>
    ),
    crossed: (
        <>
            <path d="M39 53 L49 63 M49 53 L39 63" />
            <path d="M71 53 L81 63 M81 53 L71 63" />
        </>
    ),
    unamused: (
        <>
            <path d="M36 56 H52" />
            <path d="M68 56 H84" />
            {dot(44, 60, 3)}
            {dot(76, 60, 3)}
        </>
    ),
};

const MOUTHS = {
    smile: <path d="M47 88 Q60 99 73 88" />,
    grin: <path d="M46 86 Q60 105 74 86 Z" />,
    flat: <path d="M52 91 H68" />,
    surprised: <circle cx="60" cy="92" r="4" />,
    wavy: <path d="M48 92 Q54 86 60 92 Q66 98 72 92" />,
    sad: <path d="M48 95 Q60 85 72 95" />,
};

const ROUND_GLASSES = (
    <>
        <circle cx="44" cy="58" r="15" />
        <circle cx="76" cy="58" r="15" />
        <path d="M59 56 Q60 53 61 56" />
        {/* temples, running back to the sides of the head */}
        <path d="M29 56 L19 51" />
        <path d="M91 56 L101 51" />
    </>
);

/** Solid dark lenses in both themes, the rim still follows `currentColor`. */
const SUNGLASSES = (
    <>
        <path
            d="M28 49 H59 V57 Q59 72 43.5 72 Q28 72 28 57 Z M61 49 H92 V57 Q92 72 76.5 72 Q61 72 61 57 Z"
            className="fill-neutral-950"
        />
        <path d="M59 51 H61" />
        <path d="M28 51 L19 48" />
        <path d="M92 51 L101 48" />
        <path
            d="M34 61 L40 55 M66 61 L72 55"
            className="stroke-white/60"
            strokeWidth={2}
        />
    </>
);

/** Accessories hug the head's free corners (head occupies x 22–118, y 40–140). */
const FACES: Record<OwlVariant, Face> = {
    'all-clear': {
        brows: BROWS.calm,
        eyes: EYES.happy,
        mouth: MOUTHS.smile,
        cheeks: true,
        accessory: (
            <>
                <path d="M132 14 V30 M124 22 H140" />
                <path d="M146 40 V48 M142 44 H150" />
                <path d="M22 26 V34 M18 30 H26" />
            </>
        ),
    },
    empty: {
        brows: BROWS.raised,
        eyes: pupils(4, 4),
        mouth: MOUTHS.flat,
        accessory: (
            <>
                <path d="M124 116 H156 V142 H124 Z" />
                <path d="M124 116 L117 106 M156 116 L163 106" />
                <path d="M134 124 H146" />
            </>
        ),
    },
    'no-results': {
        brows: BROWS.raised,
        eyes: pupils(5, -2),
        mouth: MOUTHS.surprised,
        accessory: (
            <>
                <circle cx="130" cy="32" r="13" />
                <path d="M139 41 L150 52" />
                <path d="M123 29 Q126 24 131 24" />
            </>
        ),
    },
    'not-found': {
        brows: BROWS.worried,
        eyes: pupils(0, -4),
        mouth: MOUTHS.wavy,
        accessory: (
            <>
                <path d="M122 20 Q122 9 133 9 Q144 9 144 19 Q144 27 133 31 V38" />
                {dot(133, 46, 2)}
            </>
        ),
    },
    error: {
        brows: BROWS.worried,
        eyes: EYES.crossed,
        mouth: MOUTHS.sad,
        accessory: (
            <>
                <path d="M133 10 L151 42 H115 Z" />
                <path d="M133 21 V32" />
                {dot(133, 37, 1.8)}
            </>
        ),
    },
    forbidden: {
        brows: BROWS.grumpy,
        eyes: null,
        glasses: SUNGLASSES,
        mouth: MOUTHS.flat,
        // wing raised palm-out, like a security guard stopping someone
        accessory: (
            <>
                <path d="M131.4 84.6 L130.6 56.6 Q130.6 51 135.4 51 Q140.2 51 140.2 56.6 Q140.2 45.4 145 45.4 Q149.8 45.4 149.8 55.8 Q149.8 49.4 154.6 49.4 Q159.4 49.4 159.4 55.8 L158.6 81.4" />
                <path d="M140.2 56.6 V67 M149.8 55.8 V67" />
                <path d="M131.4 84.6 Q125 91 118 96" />
                <path d="M158.6 81.4 Q156 106 112 118" />
                <path d="M131 92 Q142 88 153 92" />
            </>
        ),
    },
    waiting: {
        brows: BROWS.calm,
        eyes: EYES.sleepy,
        mouth: MOUTHS.surprised,
        accessory: (
            <>
                <path d="M118 34 H130 L118 46 H130" />
                <path d="M134 14 H143 L134 23 H143" />
            </>
        ),
    },
    success: {
        brows: BROWS.raised,
        eyes: EYES.happy,
        mouth: MOUTHS.grin,
        cheeks: true,
        accessory: (
            <>
                <circle cx="133" cy="30" r="15" />
                <path d="M126 30 L131 35 L141 24" />
            </>
        ),
    },
};

/**
 * The viewBox is symmetric around the head centre (x 70), so the owl stays centred
 * and accessories just overhang to the side. 97 = widest accessory reach (x 163) + padding.
 */
const VIEW_BOX = '-27 5 194 140';

type Props = SVGProps<SVGSVGElement> & { variant: OwlVariant };

/**
 * Line illustrations of the UNESC owl mascot for system states (empty, not found,
 * error…). Stroked with `currentColor`, so they follow the surrounding text colour
 * in light and dark themes.
 */
export function OwlIllustration({ variant, ...props }: Props) {
    const face = FACES[variant];

    return (
        <svg
            viewBox={VIEW_BOX}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            data-owl={variant}
            {...props}
        >
            <g transform="translate(10 30)">
                <path d="M22 46 Q17 28 24 14 L32 22 L38 10 Q46 17 50 26 Q60 22 70 26 Q74 17 82 10 L88 22 L96 14 Q103 28 98 46 Q108 66 100 86 Q90 110 60 110 Q30 110 20 86 Q12 66 22 46 Z" />
                {face.brows}
                {face.glasses ?? ROUND_GLASSES}
                {face.eyes}
                {face.cheeks && (
                    <>
                        <ellipse
                            cx="27"
                            cy="77"
                            rx="5"
                            ry="3"
                            fill="currentColor"
                            fillOpacity={0.3}
                            stroke="none"
                        />
                        <ellipse
                            cx="93"
                            cy="77"
                            rx="5"
                            ry="3"
                            fill="currentColor"
                            fillOpacity={0.3}
                            stroke="none"
                        />
                    </>
                )}
                <path d="M55 73 Q60 71 65 73 L60 81 Z" />
                {face.mouth}
                <path d="M40 104 Q44 99 48 104 Q52 99 56 104 Q60 99 64 104 Q68 99 72 104 Q76 99 80 104" />
            </g>
            {face.accessory}
        </svg>
    );
}
