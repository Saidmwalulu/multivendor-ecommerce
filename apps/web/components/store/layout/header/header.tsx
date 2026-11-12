export default function Header() {
    return(
        <div className="relative overflow-hidden bg-gradient-to-r from-[#8a9a86] to-[#5f7260] px-4 py-3 text-white shadow-lg ring-1 ring-white/20">
            {/* Glossy highlight on the top half */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />

            {/* Text sits above the shine */}
            <span className="relative z-10 text-lg drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
                Header
            </span>
        </div>
    )
}