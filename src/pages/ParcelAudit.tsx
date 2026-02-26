const ParcelAudit = () => {
  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="max-w-[210mm] mx-auto bg-[hsl(40,50%,97%)] p-12 text-[hsl(160,30%,23%)] font-serif shadow-xl">

        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-[hsl(33,40%,80%)] pb-8 mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Sklypo Auditas</h1>
            <p className="text-lg opacity-80 text-muted-foreground italic">Jūsų ramybė prasideda čia...</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-bold">TikrinuNT.lt</p>
            <p>ID: 440000387848</p>
          </div>
        </div>

        {/* Hero section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="rounded-3xl overflow-hidden shadow-lg border-8 border-background">
            <img
              src="/placeholder.svg"
              alt="Sklypo vaizdas"
              className="w-full h-80 object-cover"
            />
          </div>
          <div className="flex flex-col justify-center">
            <h2 className="text-2xl font-bold mb-4">Kodėl šis sklypas vertas dėmesio?</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Tai nuostabi 46 arų erdvė šalia Joniškio miestelio. Nors sklypas turi gamtosaugos zonų, jo potencialas namo statybai yra puikus.
            </p>
            <div className="bg-background/50 p-4 rounded-2xl border border-[hsl(33,40%,80%)]">
              <p className="text-xs uppercase font-bold text-[hsl(33,25%,55%)] mb-1">Statusas</p>
              <p className="font-bold text-lg text-green-700">✅ Patikrinta, statybos galimos</p>
            </div>
          </div>
        </div>

        {/* Restrictions */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold border-l-4 border-[hsl(33,25%,55%)] pl-4">Svarbiausi apribojimai</h3>

          <div className="flex gap-4 p-4 bg-background rounded-xl shadow-sm border border-border">
            <div className="text-2xl">🌊</div>
            <div>
              <p className="font-bold">Vandens apsaugos zona</p>
              <p className="text-sm text-muted-foreground">Pastatus projektuoti ne arčiau kaip 50m nuo pakrantės. Gamta jūsų kieme!</p>
            </div>
          </div>

          <div className="flex gap-4 p-4 bg-background rounded-xl shadow-sm border border-border">
            <div className="text-2xl">🔧</div>
            <div>
              <p className="font-bold">Melioracijos tinklai</p>
              <p className="text-sm text-muted-foreground">Drenažas dengia visą sklypą. Reikės minimalaus vamzdžių perkėlimo projekto.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParcelAudit;
