# Space Weather Mini

## Editor's note

This app is currently under construction. The stuff you read below is outdated. Stay tuned. :-)
Updated 2023-08-22.

## Etc

Check out the live app: [[demo]](https://space-weather-mini.netlify.app/)

#### Current issues (will fix soon):

- The app currently has a routing problem because the gh-pages package handles the routes inconsistently.
- Some parsing issues.

### The future plans for the site (alert service)

Initially, I started this project to construct some kind of subscription service that will send you an alert if there is a predicted/forecasted/currently ongoing solar storm / northern lights. The service would let you set the intensity of the solar storm you wish to be alerted about. I want to turn this into a free feature.

Developing and executing said plans will probably take a while due to my busy life, but I hope I can make it work. :-)

Before that, I wanted to render an actual site for the data and its visualization. Here it is!

Data & Sources
I used NASA's Space Weather data, parsed from their public directories. They are freely available for you here: [https://services.swpc.noaa.gov/text/](https://services.swpc.noaa.gov/text/)

# Space Weather Mini

Check out the live app: [[demo]](https://space-weather-mini.netlify.app/)

### Priority to-do list:

- Refactor into new version of React using functional components
- Change data handling methods to Redux
- Fix parsing issues

#### Fixed:

- **Routing problem** - clicking led to wrong path, refresh led to 404 - partially fixed with redirect, sadly there isn't much to do regarding this matter due to the static nature of GitHub. Would run fine on an actual server though.
- Some parsing issues (weekly.txt)
- Invalid elements

### The future plans for the site (alert service)

Initially, I started this project to construct some kind of subscription service that will send you an alert if there is a predicted/forecasted/currently ongoing solar storm / northern lights. The service would let you set the intensity of the solar storm you wish to be alerted about. I want to turn this into a free feature.

Developing and executing said plans will probably take a while due to my busy life, but I hope I can make it work. :-)

Before that, I wanted to render an actual site for the data and its visualization. Here it is!

Data & Sources
I used NASA's Space Weather data, parsed from their public directories. They are freely available for you here: [https://services.swpc.noaa.gov/text/](https://services.swpc.noaa.gov/text/)
