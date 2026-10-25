import type { Listing, Region } from "@/domain/directory";

/**
 * Interior design firms and contractors, and furniture stores, for fitting out a Singapore home. Built in October 2026
 * from published lists:
 *  - Qanvast's interior designer directory, for the star ratings and review counts of the firms it lists
 *  - Singareviews' "Best interior designers in Singapore" (Oct 2026), for starting prices and average HDB project costs
 *  - Terris' guides to the best HDB BTO, resale and condo firms (Aug 2026)
 *  - Home & Decor, Honeycombers and TheSmartLocal furniture roundups
 * Ratings are the ones those sites show. They change, and a rating from few reviews means little. Prices are starting
 * figures from the sources, not quotes.
 */
const QANVAST = "Qanvast reviews";
const Q = "https://qanvast.com/sg/interior-designers-architects/";

type Rate = [rating: number, votes: number] | undefined;
const r = (rating?: number, votes?: number): Rate => (rating !== undefined && votes !== undefined ? [rating, votes] : undefined);
const NL: Region = "Not listed";

type Row = [name: string, type: string, cost: number | undefined, priceNote: string, rate: Rate, note: string, url: string | undefined, profile: string | undefined, source: string];

function firms(rows: Row[]): Listing[] {
  return rows.map(([name, type, cost, priceNote, rate, note, url, profile, source]) => ({
    category: "firm",
    name,
    area: "Not listed",
    region: NL,
    type,
    cost,
    priceNote,
    rating: rate?.[0],
    votes: rate?.[1],
    ratingSource: rate ? QANVAST : undefined,
    note,
    url,
    profile: profile ? Q + profile : undefined,
    source,
  }));
}

const Q_LIST = "Qanvast directory, Oct 2026";
const SINGA = "Singareviews, Oct 2026";
const TERRIS = "Terris guides, Aug 2026";
const ASK = "ask for an itemised quote";

export const FIRMS: Listing[] = firms([
  // ---- on Qanvast's directory page, with the rating and review count it shows
  ["Urban Home Design", "Interior design firm", 50000, "from about $50,000; HDB averages about $95,000 to $114,000", r(5.0, 402), "Japandi and minimalist design, itemised quotes, iF Design Award 2025. A seven-time Qanvast SuperTrust firm.", "https://urbanhomedesign.com.sg", encodeURI("urban-home-design-二本設計家-1446"), Q_LIST],
  ["Forefront Interior", "Interior design firm", undefined, ASK, r(4.9, 596), "HDB-registered and CaseTrust. Ten-time Qanvast SuperTrust, the most of any firm on the page.", undefined, "forefront-interior-327", Q_LIST],
  ["Starry Homestead", "Design and build", 30000, "from about $30,000; new HDB averages about $72,500, resale about $90,300", r(4.8, 481), "Mass-market HDB work with in-house carpentry. HDB-licensed, CaseTrust Gold, eleven-time Qanvast SuperTrust.", "https://starryhomestead.com", "starry-homestead-123", Q_LIST],
  ["Key Concept", "Interior design firm", undefined, ASK, r(4.8, 635), "The most-reviewed firm on the page. HDB-registered and CaseTrust, five-time SuperTrust.", undefined, "key-concept-1696", Q_LIST],
  ["Charlotte's Carpentry", "Carpentry and renovation", undefined, ASK, r(4.8, 457), "Carpentry-led. HDB-registered and CaseTrust, nine-time SuperTrust.", undefined, "charlottes-carpentry-522", Q_LIST],
  ["Yang's Inspiration Design", "Interior design firm", undefined, ASK, r(4.8, 470), "HDB-registered, CaseTrust and BCA-registered. Seven-time SuperTrust.", undefined, "yangs-inspiration-design-1392", Q_LIST],
  ["Mr Designer Studio", "Interior design firm", undefined, ASK, r(4.9, 366), "HDB-registered and CaseTrust. Five-time SuperTrust.", undefined, "mr-designer-studio-1360", Q_LIST],
  ["Le Interior Affairs", "Interior design firm", undefined, ASK, r(4.9, 347), "HDB-registered and CaseTrust. Five-time SuperTrust.", undefined, "le-interior-affairs-1707", Q_LIST],
  ["Renologist", "Interior design firm", undefined, ASK, r(4.8, 351), "HDB-registered, CaseTrust and RCMA accredited. Three-time SuperTrust.", undefined, "renologist-1554", Q_LIST],
  ["Darwin Interior", "Design and build", undefined, ASK, r(4.8, 306), "A BCA Licensed General Builder and CaseTrust RCMA firm. Five-time SuperTrust.", undefined, "darwin-interior-629", Q_LIST],
  ["Jesigns Interior Design", "Interior design firm", undefined, ASK, r(5.0, 259), "HDB-registered and CaseTrust. A perfect rating, from fewer reviews than most.", undefined, "jesigns-interior-design-2005", Q_LIST],
  ["Massing Design", "Interior design firm", undefined, ASK, r(4.8, 238), "HDB-registered, CaseTrust and SIDAS. Two-time SuperTrust.", undefined, "massing-design-1895", Q_LIST],
  ["ECasa Studio", "Interior design firm", undefined, ASK, r(4.9, 70), "HDB-registered, CaseTrust and BCA-registered. A newer listing with fewer reviews.", undefined, "ecasa-studio-1352", Q_LIST],
  // ---- named in Singareviews' and Terris' guides, with the Qanvast figures those guides quote
  ["Design 4 Space", "Design and build", 50000, "from about $50,000; HDB averages about $62,800", r(4.8, 437), "A large accredited firm with budget-tiered packages and three showrooms. CaseTrust-RCMA, suited to bigger resale jobs.", "https://design4space.com.sg", undefined, SINGA],
  ["The Interior Lab", "Interior design firm", 30000, "from about $30,000; new HDB averages about $77,500, resale about $96,700", r(4.8, 347), "HDB, condo and landed. In-house carpentry with Blum hardware. SuperTrust every year from 2019.", "https://theinteriorlab.com.sg", undefined, SINGA],
  ["Ciseern", "Interior design firm", undefined, ASK, r(4.88, 330), "In business since 1997, with deep experience in older flats. A former HDB showflat designer, CaseTrust-RCMA.", "https://ciseern.com", undefined, TERRIS],
  ["Swiss Interior", "Design and build", undefined, ASK, r(4.78, 241), "A BTO and HDB specialist since 2012, with Blum-certified carpentry. Qanvast SuperTrust 2021 to 2024.", "https://swissinterior.com.sg", undefined, TERRIS],
  ["Jialux Interior", "Interior design firm", undefined, ASK, r(4.85, 286), "Publishes typical HDB project figures and is open about which works need permits.", "https://jialuxinterior.com", undefined, TERRIS],
  ["SG Interior Design", "Interior design firm", 30000, "from about $30,000; HDB averages about $90,700", r(4.9, 184), "HDB and condo, with transparent pricing and a five-year warranty.", "https://sginterior.com.sg", undefined, SINGA],
  ["Space Atelier", "Interior design firm", 30000, "from about $30,000; new HDB averages about $75,500, resale about $87,100", r(4.7, 410), "Mid-range HDB and condo, plus commercial and office design.", "https://spaceatelier.com.sg", undefined, SINGA],
  ["The Local INN.terior", "Interior design firm", undefined, ASK, r(4.74, 410), "Character-led, collaborative design across home types.", "https://thelocalinnterior.com.sg", undefined, TERRIS],
  ["Weiken", "Design and build", 30000, "from about $30,000", r(4.7, 223), "A large design-and-build firm with four showrooms. CaseTrust Gold and RCMA accredited.", "https://weiken.com", undefined, SINGA],
  ["Ovon Design", "Interior design firm", 40000, "from about $40,000; new HDB averages about $77,900, resale about $142,500", r(4.8, 168), "A boutique, design-led studio for mid-to-high-end homes. HDB-registered and CaseTrust-RCMA.", "https://ovon-d.com", undefined, SINGA],
  ["MET Interior", "Interior design firm", undefined, ASK, r(4.68, 210), "Versatile across BTO, resale, condo and landed, and strong on resale reconfiguration. SuperTrust 2022 to 2026.", "https://metinterior.com.sg", undefined, TERRIS],
  ["The Interior Place", "Interior design firm", 30000, "from about $30,000; HDB averages about $75,500", r(4.5, 36), "Founder-led residential and commercial work. Few reviews so far.", "https://theinteriorplace.com.sg", undefined, SINGA],
  ["Earth Interior Design", "Interior design firm", 50000, "from about $50,000", r(4.46, 58), "Design-led HDB and condo work with award entries.", "https://earthid.sg", undefined, SINGA],
  // ---- named in the guides, with no rating we could confirm
  ["Homescape", "Design and build", undefined, ASK, undefined, "A newer firm that keeps masonry, carpentry, electrical and tiling under one roof.", "https://homescape.com.sg", undefined, TERRIS],
  ["The Alchemists Design", "Interior design firm", undefined, ASK, undefined, "Bespoke, design-led renovations. Described as upfront about pricing.", "https://thealchemistsdesign.com", undefined, TERRIS],
  ["Carpenters", "Carpentry and renovation", undefined, ASK, undefined, "In-house carpentry and a BCA Licensed General Builder, with a lifetime Blum hardware warranty.", "https://carpenters.com.sg", undefined, TERRIS],
  ["Space Factor", "Interior design firm", 40000, "condo work typically $40,000 to $80,000 or more, priced by the work done", undefined, "Modern luxury design, mostly for condos.", "https://spacefactor.com.sg", undefined, TERRIS],
  ["Absolook Interior Design", "Interior design firm", undefined, ASK, undefined, "Won an Asia Pacific Property Award for Best Interior Design Apartment, Singapore.", "https://absolookid.com.sg", undefined, TERRIS],
  ["Crescendo Interior Designers", "Interior design firm", undefined, ASK, undefined, "An established firm for HDB, condo, landed and commercial.", "https://crescendo.sg", undefined, SINGA],
  ["Artist Room", "Interior design firm", undefined, ASK, undefined, "Award-winning condo design.", "https://artistroom.com.sg", undefined, SINGA],
  ["A&D Designer's Group", "Interior design firm", undefined, ASK, undefined, "HDB work led by carpentry.", "https://interior.sg", undefined, SINGA],
  ["Home Guide", "Interior design firm", undefined, ASK, undefined, "Homes, plus office and retail fit-outs.", "https://homeguide.com.sg", undefined, SINGA],
  ["Elliot James", "Interior design firm", undefined, "no published pricing", undefined, "Luxury homes, penthouses and hospitality. Aimed at high budgets.", "https://elliotjames.com", undefined, SINGA],
  ["EightyTwo", "Interior design firm", undefined, "no published pricing", undefined, "Understated luxury for condos, landed homes and developer projects. Aimed at high budgets.", "https://eightytwo.asia", undefined, SINGA],
]);

// ---------------------------------------------------------------- furniture stores
const SRC_HD = "Home & Decor furniture guide";
const SRC_HC = "Honeycombers furniture guide";
const SRC_SL = "TheSmartLocal online furniture guide";
const ON: Region = "Not listed";

type FRow = [name: string, area: string, region: Region, type: string, band: 1 | 2 | 3 | 4, priceNote: string, note: string, url: string, source: string];

function furniture(rows: FRow[]): Listing[] {
  return rows.map(([name, area, region, type, band, priceNote, note, url, source]) => ({ category: "furniture", name, area, region, type, band, priceNote, note, url, source }));
}

export const FURNITURE: Listing[] = furniture([
  ["IKEA", "Jurong East, Alexandra and Tampines", "West", "Flat-pack furniture", 1, "budget, with a broad range", "The default for budget furniture. The Tampines store sits near Courts Megastore, so one trip covers both.", "https://ikea.com/sg/en", SRC_HD],
  ["HipVan", "Clarke Quay", "Marina Bay & CBD", "Furniture and decor", 2, "mid-range; free delivery above $250", "A large online catalogue of 10,000 or more items, direct from manufacturers, with 100-night mattress trials.", "https://hipvan.com", SRC_SL],
  ["Castlery", "Liat Towers, Orchard Road", "Orchard & Tanglin", "Modern furniture", 3, "mid-to-premium; free delivery and assembly above $300", "Sits between IKEA and luxury. Its room designer tool helps plan a first home. A smaller catalogue.", "https://castlery.com/sg", SRC_HD],
  ["FortyTwo", "Online only", ON, "Online furniture", 2, "mid-range; free delivery over $300, 100-day returns", "Over 10,000 items, with price matching and a refund of the difference within two weeks.", "https://fortytwo.sg", SRC_SL],
  ["Commune", "Millenia Walk, and Tan Boon Liat Building", "Marina Bay & CBD", "Furniture and decor", 3, "mid-to-premium", "Designed by an in-house team, with midcentury-modern and industrial looks and eco-friendly materials.", "https://thecommunelife.com", SRC_HD],
  ["Nitori", "Orchard Road, Courts Level 4", "Orchard & Tanglin", "Japanese furniture", 2, "mid-range", "Practical, compact Japanese designs that suit small flats.", "https://nitori.com.sg", SRC_HD],
  ["Island Living", "Kaki Bukit Avenue 1", "East", "Rattan and teak furniture", 2, "mid-range", "Light, natural rattan and coastal styles, with reclaimed teak.", "https://islandliving.sg", SRC_HD],
  ["Courts", "Tampines Megastore and islandwide", "East", "Furniture and appliances", 2, "mid-range; instalment plans up to 3 years", "A chain that sells furniture and appliances together, so one delivery can cover both.", "https://courts.com.sg", SRC_HC],
  ["Harvey Norman", "Millenia Walk and Parkway Parade", "Marina Bay & CBD", "Furniture and appliances", 2, "mid-range, with discounts varying by outlet", "An Italian range with over 100 leather options, plus appliances.", "https://harveynorman.com.sg", SRC_HC],
  ["Robinsons", "Online only", ON, "Department store", 2, "mid-range", "Accessories, bedding and appliances, sold online.", "https://robinsons.com.sg", SRC_HD],
  ["BedandBasics", "Online only", ON, "Online furniture", 1, "low to mid hundreds for most items; free delivery above $150", "Japanese-style affordable furniture such as storage beds and dining tables. Assembly costs $38.", "https://bedandbasics.sg", SRC_SL],
  ["FurnitureSG", "Online only", ON, "Online furniture", 1, "budget; free delivery and installation", "Beds, sofas, dining sets, cabinets and mattresses, with free delivery and installation and no minimum spend.", "https://furnituresg.com.sg", SRC_HC],
  ["Born in Colour", "Tan Boon Liat Building, Outram Road", "Chinatown & Tanjong Pagar", "Furniture", 2, "budget to mid-range; free delivery and assembly above $1,000", "Scandinavian and Korean looks, including retro pieces. Space-efficient designs.", "https://bornincolour.com", SRC_HC],
  ["Soul & Tables", "Tan Boon Liat Building, Outram Road", "Chinatown & Tanjong Pagar", "Solid wood furniture", 2, "slightly above average; free delivery and installation", "Oak and teak furniture from local and international brands, plus a house brand.", "https://soulandtables.com.sg", SRC_SL],
  ["Cozmo", "Tan Boon Liat Building, Outram Road", "Chinatown & Tanjong Pagar", "Modular sofas", 3, "mid-to-premium", "Modular sofas with interchangeable covers, and free fabric samples.", "https://cozmo.sg", SRC_HC],
  ["Grey & Sanders", "Tan Boon Liat Building, Outram Road", "Chinatown & Tanjong Pagar", "Solid wood furniture", 3, "premium", "Handcrafted solid wood sofas, dining tables and bed frames, with made-to-order live-edge tables.", "https://greyandsanders.com", SRC_HD],
  ["Journey East", "Tan Boon Liat Building, Outram Road", "Chinatown & Tanjong Pagar", "Vintage and designer furniture", 3, "premium, one-of-a-kind pieces", "Mid-century and Art Deco pieces, and unusual decor.", "https://journeyeast.com", SRC_HC],
  ["Scanteak", "Paya Lebar and Suntec City", "East", "Teak furniture", 2, "mid-range", "Scandinavian-style teak furniture from sustainably sourced timber.", "https://scanteak.com.sg", SRC_HC],
  ["Cellini", "Suntec City and The Centrepoint", "City Hall, Bras Basah & Bugis", "Furniture sets", 2, "mid-range, sold in bundled sets", "Local designer furniture, with living, dining and bedroom packages.", "https://cellini.com.sg", SRC_HC],
  ["Originals", "Bukit Batok Street 22", "West", "Teak and vintage furniture", 2, "mid-range to premium", "Natural teak, remodelled vintage pieces and soft furnishings.", "https://originals.com.sg", SRC_HC],
  ["Layard Interiors", "Tanglin Mall", "Orchard & Tanglin", "Tropical homewares", 2, "mid-range", "Rattan chairs and tables, artisan-made in Java, in a tropical style.", "https://layardinteriors.com", SRC_HC],
  ["Bode", "Henderson Road", "South & Sentosa", "Fabrics and wallcoverings", 3, "mid-to-premium", "Fabrics, wallcoverings, rugs and leathers from design houses. Popular with designers.", "https://bode.com.sg", SRC_HC],
  ["Spaceman", "Lavender Street", "City Hall, Bras Basah & Bugis", "Space-saving furniture", 3, "premium; free space planning", "Italian space-saving furniture: Murphy beds, sofa beds and expandable tables. Good for small flats.", "https://spaceman.com", SRC_HC],
  ["Heveya", "Eng Hoon Street and Tangs Orchard", "Orchard & Tanglin", "Mattresses", 3, "premium", "Organic latex mattresses, motorised bed bases and pillows.", "https://heveya.sg", SRC_HC],
  ["Kuhl Home", "Pasir Panjang Road", "South & Sentosa", "Kids' furniture", 2, "competitive pricing", "Children's furniture, including convertible modular beds.", "https://kuhlhome.com", SRC_HC],
  ["Star Living", "Online and showrooms", ON, "Furniture", 2, "mid-range; free delivery above $500", "Traditional and modern furniture from several brands.", "https://starliving.com.sg", SRC_SL],
  ["Mason's Home Decor", "Online and showroom", ON, "Solid wood furniture", 2, "mid-range; free delivery above $200", "In-house solid wood pieces such as suar wood TV consoles.", "https://mason.com.sg", SRC_SL],
  ["Wihardja", "Online and showroom", ON, "Teak and suar furniture", 2, "affordable for solid wood", "Handcrafted teak and suar wood furniture, with custom designs.", "https://wihardja.com.sg", SRC_SL],
  ["Loft Home Furniture", "Online and showroom", ON, "Statement furniture", 2, "relatively affordable, direct from the factory", "Eclectic and themed pieces.", "https://lofthome.com", SRC_SL],
  ["Locus Habitat", "Online and showroom", ON, "Leather sofas", 3, "premium", "Classic and modern designs, known for leather sofas and handmade pieces.", "https://locushabitat.com", "Locus Habitat's own guide"],
  ["Danish Design Co", "Pasir Panjang Road", "South & Sentosa", "Danish designer furniture", 4, "premium", "Danish furniture from designers such as Hans Wegner. Authenticity guaranteed.", "https://danishdesignco.com.sg", SRC_HC],
  ["Fritz Hansen", "W Atelier, Henderson Road", "South & Sentosa", "Designer furniture", 4, "premium, a single-brand store", "Designer sofas and dining tables, and the Egg and Swan chairs.", "https://watelier.com/brand/fritz-hansen", SRC_HC],
  ["Space Furniture", "Bencoolen Street", "City Hall, Bras Basah & Bugis", "Designer furniture", 4, "luxury", "Design brands such as B&B Italia, Kartell and Poliform, plus outdoor furniture.", "https://spacefurniture.com.sg", SRC_HD],
  ["Nook & Cranny", "Online only", ON, "Outdoor furniture", 2, "mid-range; free delivery above $300", "Outdoor wicker furniture such as armchairs and daybeds, and decorative items.", "https://nookandcranny.com", SRC_SL],
]);

export const RENO_LISTINGS = { firm: FIRMS, furniture: FURNITURE } as const;
