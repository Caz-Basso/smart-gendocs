export default function AppLogo() {
    return (
        <>
            <img
                src="/unesc-logo.png"
                alt="UNESC"
                className="size-8 shrink-0 object-contain"
            />
            <div className="ml-2 grid flex-1 text-left text-base leading-tight">
                <span className="truncate font-semibold tracking-tight">
                    <span className="font-normal">Smart</span>
                    <span className="text-foreground">.</span>
                    <span className="font-medium text-[#0B5E3B] dark:text-emerald-300">
                        SAU
                    </span>
                </span>
            </div>
        </>
    );
}
