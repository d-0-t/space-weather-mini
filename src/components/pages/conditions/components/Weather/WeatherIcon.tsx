import "./WeatherIcon.scss";
import AcUnitIcon from "@mui/icons-material/AcUnit";
import CloudIcon from "@mui/icons-material/Cloud";
import CloudQueueIcon from "@mui/icons-material/CloudQueue";
import FoggyIcon from "@mui/icons-material/Foggy";
import GrainIcon from "@mui/icons-material/Grain";
import HelpIcon from "@mui/icons-material/Help";
import SevereColdIcon from "@mui/icons-material/SevereCold";
import ThunderstormIcon from "@mui/icons-material/Thunderstorm";
import UmbrellaIcon from "@mui/icons-material/Umbrella";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import WbSunnyIcon from "@mui/icons-material/WbSunny";
import type { SvgIconComponent } from "@mui/icons-material";
import { wmoWeather } from "../../../../../data/wmo-codes";

/**
 * The WMO icon-name to glyph map for the weather blocks (ticket 03). The
 * lookup file owns the names; this map owns the rendering, so the data
 * stays pure text and the icons stay a page concern.
 */
const WEATHER_ICON_BY_NAME: Record<string, SvgIconComponent> = {
  clear: WbSunnyIcon,
  "mostly-clear": WbSunnyIcon,
  "partly-cloudy": CloudQueueIcon,
  overcast: CloudIcon,
  fog: FoggyIcon,
  drizzle: WaterDropIcon,
  "freezing-drizzle": SevereColdIcon,
  rain: UmbrellaIcon,
  "freezing-rain": SevereColdIcon,
  snow: AcUnitIcon,
  "snow-grains": GrainIcon,
  "rain-showers": UmbrellaIcon,
  "snow-showers": AcUnitIcon,
  thunderstorm: ThunderstormIcon,
  "thunderstorm-hail": ThunderstormIcon,
  unknown: HelpIcon,
};

/** The WMO icon for a weather code; the text label sits beside it. */
const WeatherIcon: React.FC<{ code: number }> = ({ code }) => {
  const Icon = WEATHER_ICON_BY_NAME[wmoWeather(code).icon] ?? HelpIcon;
  const text = wmoWeather(code).text;
  return (
    <Icon
      aria-hidden="true"
      className="weather-icon"
      fontSize="inherit"
      {...({ title: text } as unknown as Record<string, string>)}
    />
  );
};

export default WeatherIcon;
