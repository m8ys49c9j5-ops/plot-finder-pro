const ParcelAudit2 = () => {
  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="max-w-[210mm] mx-auto space-y-12">

        {/* Page 1: Cover */}
        <div className="bg-[hsl(120,40%,92%)] p-12 text-[hsl(120,40%,20%)] font-serif shadow-xl rounded-lg">
          <h1 className="text-4xl font-bold text-center mb-3">Sklypo Analizė: Specialios Sąlygos</h1>
          <p className="text-center text-lg italic opacity-80 mb-8">🏡 Jaukus gidas jūsų sklypui!</p>
          <div className="text-base leading-relaxed">
            <p><span className="font-bold">Adresas:</span> Molėtų r., Bijūnų g. 13</p>
            <p><span className="font-bold">Plotas:</span> 0,4620 ha</p>
            <p><span className="font-bold">Paskirtis:</span> Gyvenamieji pastatai</p>
          </div>
        </div>

        {/* Page 2: Zones Table */}
        <div className="bg-[hsl(0,0%,96%)] p-12 font-serif shadow-xl rounded-lg">
          <h2 className="text-2xl font-bold text-center text-[hsl(220,80%,45%)] mb-8">Zonų Apžvalga</h2>
          <div className="overflow-x-auto">
            <table className="w-full border border-[hsl(210,60%,80%)] bg-background rounded-lg text-sm">
              <thead>
                <tr className="bg-[hsl(210,60%,93%)]">
                  <th className="p-3 text-left border-b border-[hsl(210,60%,80%)]">Nr</th>
                  <th className="p-3 text-left border-b border-[hsl(210,60%,80%)]">Kodas</th>
                  <th className="p-3 text-left border-b border-[hsl(210,60%,80%)]">Pavadinimas</th>
                  <th className="p-3 text-left border-b border-[hsl(210,60%,80%)]">Plotas</th>
                  <th className="p-3 text-left border-b border-[hsl(210,60%,80%)]">Rizika</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { nr: 1, kodas: "106", pav: "Elektros tinklai", plotas: "865 m²", rizika: "🟢 Žema", color: "hsl(120,40%,92%)" },
                  { nr: 2, kodas: "121", pav: "Melioracija", plotas: "4620 m²", rizika: "🟢 Žema", color: "hsl(120,40%,92%)" },
                  { nr: 3, kodas: "131", pav: "Pievos", plotas: "2333 m²", rizika: "🟡 Vidutinė", color: "hsl(45,90%,92%)" },
                  { nr: 4, kodas: "163", pav: "Vandens zona", plotas: "1175 m²", rizika: "🔴 Aukšta", color: "hsl(0,70%,93%)" },
                  { nr: 5, kodas: "164", pav: "Pakrantė", plotas: "865 m²", rizika: "🔴 Aukšta", color: "hsl(0,70%,93%)" },
                ].map((row) => (
                  <tr key={row.nr} style={{ backgroundColor: row.color }}>
                    <td className="p-3 border-b border-[hsl(210,60%,90%)]">{row.nr}</td>
                    <td className="p-3 border-b border-[hsl(210,60%,90%)]">{row.kodas}</td>
                    <td className="p-3 border-b border-[hsl(210,60%,90%)] font-medium">{row.pav}</td>
                    <td className="p-3 border-b border-[hsl(210,60%,90%)]">{row.plotas}</td>
                    <td className="p-3 border-b border-[hsl(210,60%,90%)] font-bold">{row.rizika}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Page 3: Map & Details */}
        <div className="bg-[hsl(210,50%,92%)] p-12 font-serif shadow-xl rounded-lg">
          <h2 className="text-2xl font-bold text-center text-[hsl(220,60%,30%)] mb-8">Žemėlapis su Zonomis</h2>
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <svg viewBox="0 0 200 200" className="w-64 h-64 flex-shrink-0">
              <rect width="200" height="200" fill="hsl(210,50%,88%)" rx="12" />
              <polygon points="40,160 80,60 160,80 140,160" fill="hsl(120,40%,75%)" stroke="hsl(120,40%,35%)" strokeWidth="2" strokeDasharray="6,3" />
              <polygon points="80,60 130,50 160,80 100,90" fill="hsl(45,80%,75%)" stroke="hsl(45,60%,40%)" strokeWidth="1.5" opacity="0.8" />
              <ellipse cx="150" cy="140" rx="35" ry="25" fill="hsl(210,60%,70%)" stroke="hsl(210,60%,40%)" strokeWidth="1.5" opacity="0.7" />
            </svg>
            <div className="space-y-3 text-base">
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 rounded bg-[hsl(120,40%,75%)] border border-[hsl(120,40%,35%)] inline-block" />
                <span>Žalia: Melioracija (visas sklypas)</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 rounded bg-[hsl(45,80%,75%)] border border-[hsl(45,60%,40%)] inline-block" />
                <span>Geltona: Pievos (pusė)</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 rounded bg-[hsl(210,60%,70%)] border border-[hsl(210,60%,40%)] inline-block" />
                <span>Mėlyna: Vanduo (arti tvenkinio)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Page 4: Conclusion */}
        <div className="bg-[hsl(50,80%,92%)] p-12 font-serif shadow-xl rounded-lg">
          <h2 className="text-2xl font-bold text-center text-[hsl(30,80%,45%)] mb-8">Išvada ir Patarimai</h2>
          <div className="space-y-4 text-base leading-relaxed">
            <p>✅ <span className="font-bold">Privalumai:</span> Graži gamta, lengva prižiūrėti.</p>
            <p>⚠️ <span className="font-bold">Rizikos:</span> Vandens zonos riboja statybas.</p>
            <p className="bg-background/60 p-4 rounded-xl border border-[hsl(30,60%,75%)] font-bold text-lg mt-6">
              🏠 Rekomendacija: Pirkite, jei norite poilsio!
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ParcelAudit2;
