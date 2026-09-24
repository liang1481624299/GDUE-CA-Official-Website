"use client";

/**
 * LocationSelect —— 三级行政区级联下拉（国家 → 一级行政区 → 二级行政区）
 *
 * - 全球 ~160 个国家/地区，按大洲分组
 * - 国家选择支持搜索（中文名、英文名、拼音、首字母）
 * - **语言关联**：国家名按当前 locale 动态显示（Intl.DisplayNames），
 *   排序随语言切换，大洲标题走 i18n
 * - 存储值始终为中文名（zh 字段），与后端一致
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2, Search, ChevronDown, Check } from "lucide-react";
import {
  ALL_COUNTRIES,
  COUNTRIES_BY_CONTINENT,
  CONTINENTS,
  searchCountries,
  type CountryInfo,
} from "@/lib/data/countries";
import { REGIONS_HIERARCHY } from "@/lib/data/regions";

/* ---------- locale → Intl language tag ---------- */
function localeToIntlLang(locale: string): string {
  if (locale === "zh-CN" || locale === "zh-TW") return "zh";
  if (locale === "ja") return "ja";
  return "en";
}

/* ---------- 获取国家名的本地化显示 ---------- */
const displayNamesCache: Record<string, Intl.DisplayNames> = {};
function getCountryDisplayName(code: string, locale: string): string {
  const lang = localeToIntlLang(locale);
  if (!displayNamesCache[lang]) {
    try {
      displayNamesCache[lang] = new Intl.DisplayNames([lang], { type: "region" });
    } catch {
      displayNamesCache[lang] = new Intl.DisplayNames(["en"], { type: "region" });
    }
  }
  try {
    return displayNamesCache[lang].of(code) || code;
  } catch {
    return code;
  }
}

/* ---------- 大洲名 i18n key 映射 ---------- */
const CONTINENT_I18N: Record<string, string> = {
  亚洲: "profile.continentAsia",
  欧洲: "profile.continentEurope",
  美洲: "profile.continentAmerica",
  非洲: "profile.continentAfrica",
  大洋洲: "profile.continentOceania",
};

/* ---------- 组件 ---------- */

interface Props {
  country: string;
  region: string;
  locality: string;
  onCountryChange: (v: string) => void;
  onRegionChange: (v: string) => void;
  onLocalityChange: (v: string) => void;
}

export function LocationSelect({
  country,
  region,
  locality,
  onCountryChange,
  onRegionChange,
  onLocalityChange,
}: Props) {
  const { t, locale } = useI18n();
  const [locating, setLocating] = useState(false);
  const [locMsg, setLocMsg] = useState<string | null>(null);

  const [countrySearch, setCountrySearch] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const countryRef = useRef<HTMLDivElement>(null);

  const selectedCountry = ALL_COUNTRIES.find((c) => c.zh === country);
  const regions = country ? Object.keys(REGIONS_HIERARCHY[country] || {}) : [];
  const localities = country && region ? REGIONS_HIERARCHY[country]?.[region] || [] : [];

  // 当前选中国家的本地化显示名
  const selectedCountryLabel = selectedCountry
    ? getCountryDisplayName(selectedCountry.code, locale)
    : "";

  useEffect(() => {
    if (region && !regions.includes(region)) onRegionChange("");
    if (locality && !localities.includes(locality)) onLocalityChange("");
  }, [country]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (locality && !localities.includes(locality)) onLocalityChange("");
  }, [region]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) {
        setCountryOpen(false);
      }
    }
    if (countryOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [countryOpen]);

  // 搜索结果
  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return null;
    return searchCountries(countrySearch);
  }, [countrySearch]);

  // 按当前语言排序的大洲分组（用于默认展示）
  const sortedContinents = useMemo(() => {
    return CONTINENTS.map((continent) => ({
      continent,
      countries: [...COUNTRIES_BY_CONTINENT[continent]].sort((a, b) =>
        getCountryDisplayName(a.code, locale).localeCompare(
          getCountryDisplayName(b.code, locale),
          localeToIntlLang(locale)
        )
      ),
    }));
  }, [locale]);

  function selectCountry(c: CountryInfo) {
    onCountryChange(c.zh);
    setCountryOpen(false);
    setCountrySearch("");
  }

  async function autoLocate() {
    if (!navigator.geolocation) {
      setLocMsg(t("profile.geolocationUnsupported"));
      return;
    }
    setLocating(true);
    setLocMsg(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const lang = localeToIntlLang(locale);
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=${lang}`
          );
          const data = await res.json();
          const addr = data.address || {};
          const rawCountry = addr.country || "";
          const matchedCountry = ALL_COUNTRIES.find(
            (c) =>
              rawCountry.includes(c.zh) ||
              c.zh.includes(rawCountry) ||
              rawCountry.toLowerCase().includes(c.en.toLowerCase()) ||
              getCountryDisplayName(c.code, locale) === rawCountry
          );
          if (!matchedCountry) {
            setLocMsg(t("profile.locateFailed"));
            setLocating(false);
            return;
          }
          onCountryChange(matchedCountry.zh);
          const rawRegion = addr.state || addr.region || addr.province || "";
          const regionList = Object.keys(REGIONS_HIERARCHY[matchedCountry.zh] || {});
          let matchedRegion = "";
          if (matchedCountry.zh === "中国") {
            const norm = rawRegion.replace(/(省|市|自治区|特别行政区)$/, "");
            matchedRegion = regionList.find(
              (p) => rawRegion.includes(p) || p.includes(norm) || norm.includes(p)
            ) || "";
          } else {
            matchedRegion = regionList.find(
              (r) => rawRegion.toLowerCase().includes(r.toLowerCase()) || r.toLowerCase().includes(rawRegion.toLowerCase())
            ) || "";
          }
          onRegionChange(matchedRegion);
          const rawLocality = addr.city || addr.town || addr.county || addr.suburb || "";
          let matchedLocality = "";
          if (matchedRegion) {
            const locs = REGIONS_HIERARCHY[matchedCountry.zh]?.[matchedRegion] || [];
            matchedLocality = locs.find(
              (l) => rawLocality.toLowerCase().includes(l.toLowerCase()) || l.toLowerCase().includes(rawLocality.toLowerCase())
            ) || "";
          }
          onLocalityChange(matchedLocality);
          if (!matchedRegion) setLocMsg(t("profile.locatePartialMatch"));
          else if (!matchedLocality) setLocMsg(t("profile.locatePartialMatchLevel2"));
          else setLocMsg(t("profile.locateSuccess"));
        } catch {
          setLocMsg(t("profile.locateFailed"));
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocMsg(t("profile.locateDenied"));
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }

  const selectClass =
    "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={autoLocate} disabled={locating}>
          {locating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("profile.locating")}
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4" />
              {t("profile.autoLocate")}
            </>
          )}
        </Button>
        {locMsg && <span className="text-sm text-muted-foreground">{locMsg}</span>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 国家 —— 可搜索下拉，按当前语言显示 */}
        <div className="space-y-2">
          <Label>{t("profile.country")}</Label>
          <div className="relative" ref={countryRef}>
            <button
              type="button"
              onClick={() => setCountryOpen((o) => !o)}
              className={`${selectClass} justify-between ${!country ? "text-muted-foreground" : ""}`}
            >
              {selectedCountryLabel || t("profile.selectCountry")}
              <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
            </button>
            {countryOpen && (
              <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-72 overflow-hidden flex flex-col">
                <div className="p-2 border-b">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      autoFocus
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                      placeholder={t("profile.searchCountry")}
                      className="h-8 pl-8 text-sm"
                    />
                  </div>
                </div>
                <div className="overflow-y-auto flex-1">
                  {filteredCountries ? (
                    filteredCountries.length === 0 ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        {t("profile.noCountryFound")}
                      </div>
                    ) : (
                      filteredCountries
                        .sort((a, b) =>
                          getCountryDisplayName(a.code, locale).localeCompare(
                            getCountryDisplayName(b.code, locale),
                            localeToIntlLang(locale)
                          )
                        )
                        .map((c) => (
                          <CountryOption
                            key={c.code}
                            info={c}
                            selected={country === c.zh}
                            locale={locale}
                            onClick={() => selectCountry(c)}
                          />
                        ))
                    )
                  ) : (
                    sortedContinents.map(({ continent, countries }) => (
                      <div key={continent}>
                        <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                          {t(CONTINENT_I18N[continent] || continent)}
                        </div>
                        {countries.map((c) => (
                          <CountryOption
                            key={c.code}
                            info={c}
                            selected={country === c.zh}
                            locale={locale}
                            onClick={() => selectCountry(c)}
                          />
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 一级行政区 */}
        <div className="space-y-2">
          <Label>{t("profile.region")}</Label>
          <select
            value={region}
            onChange={(e) => onRegionChange(e.target.value)}
            disabled={!country || regions.length === 0}
            className={selectClass}
          >
            <option value="">
              {regions.length === 0 ? t("profile.noRegionOption") : t("profile.selectRegion")}
            </option>
            {regions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* 二级行政区 */}
        <div className="space-y-2">
          <Label>{t("profile.locality")}</Label>
          <select
            value={locality}
            onChange={(e) => onLocalityChange(e.target.value)}
            disabled={!region || localities.length === 0}
            className={selectClass}
          >
            <option value="">
              {localities.length === 0 ? t("profile.noLocalityOption") : t("profile.selectLocality")}
            </option>
            {localities.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{t("profile.locationDropdownHint")}</p>
    </div>
  );
}

/* ---------- 国家选项子组件 ---------- */
function CountryOption({
  info,
  selected,
  locale,
  onClick,
}: {
  info: CountryInfo;
  selected: boolean;
  locale: string;
  onClick: () => void;
}) {
  const localizedName = getCountryDisplayName(info.code, locale);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-accent ${
        selected ? "bg-accent/50 font-medium" : ""
      }`}
    >
      <span>{localizedName}</span>
      <span className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{info.en}</span>
        {selected && <Check className="h-3.5 w-3.5 text-primary" />}
      </span>
    </button>
  );
}

export { REGIONS_HIERARCHY };
