//const CACHE_NAME = 'countdown.travel v??'; // ← Change version to force cleanup here!
importScripts('/shared-code.js');



const DEBUG_MODE = true; // Set to `true` in development, `false` in production

if (!DEBUG_MODE) {
  console.log = () => {}; // Silences all console.log calls
}



const MAX_CACHE_AGE = 6 * 60 * 60 * 1000; // 6h in ms



const URLS_TO_CACHE = [
  '/'
  , '/index.html'
  , '/favicon.ico'
  , '/favicon2.png'
  , '/BGCF.jpg'
  , '/manifest.json'
  , '/icon512_maskable2.png'
  , '/icon512_rounded2.png'
  , '/styles2.css'
  , '/lz-string.js'
  , '/country-to-currency.min.js'
  , '/currency.min.js'
  , '/suntimes.js'
  , '/d3at7.js'
  , '/d3-arrayat3.js'
  , '/d3-geoat3.js'
  , '/topojson-clientat3.js'
  , '/countries-110m.json'
  , '/all.js'
  , '/Aileron-Regular.otf'
  , '/LibertinusSans-Regular.ttf'
  , '/LibertinusSans-Bold.ttf'
  , '/LibertinusSans-Italic.ttf'
];



/*
var globalDiffMilliseconds = 0;
var globalSyncedUTCDateTime = new Date(Date.now());
*/



const ResponseOKMetaData = {
  status: 200,
  statusText: 'OK',
  headers: {
    'Content-Type': 'application/json; charset=utf-8'
  }
};



const ResponseNotFound =  new Response(JSON.stringify({
  error: 'Not Found',
  message: 'The requested resource was not found',
  status: 404
}), {
  status: 404,
  statusText: 'Not Found',
  headers: {
    'Content-Type': 'application/json; charset=utf-8'
  }
});



const ResponseInternal =  new Response(JSON.stringify({
  error: 'Internal Server Error',
  message: 'The requested resource has encounered an Internal Server Error',
  status: 500
}), {
  status: 500,
  statusText: 'Internal Server Error',
  headers: {
    'Content-Type': 'application/json; charset=utf-8'
  }
});



// Call install Event
self.addEventListener('install', e => {
  console.log('Service Worker: install');
  // Wait until promise is finished
  e.waitUntil(
    caches.open(CACHE_NAME)
    .then((cache) => {
      URLS_TO_CACHE.map((url) => {
        const fullURL = BASE_URL + url;
        fetch(fullURL)
        .then((resp) => {
          console.log(`Service Worker: install ${CACHE_NAME} respClone: e.waitUntil() caches.open() fetch.then(): ${fullURL}`);

          const respClone = resp.clone();

          //cache.put(fullURL, respClone);
          const request = new Request(fullURL);
          handleOrdinaryRequest(request);
        });
        return url;
      });

      const request = new Request(BASE_URL + '/precisiontime/');
      handlePrecisiontimeRequest(request, MAX_CACHE_AGE * 4).then((resp) => {
        console.log(`Service Worker: install ${CACHE_NAME} handlePrecisiontimeRequest: ${request.url}`);
      });
    })
    .then(() => self.skipWaiting())
  );
});



// Call Activate Event
self.addEventListener('activate', e => {
  console.log('Service Worker: activate');
  // Clean up old caches by looping through all of the
  // caches and deleting any old caches or caches that
  // are not defined in the list
  e.waitUntil(
    caches.keys().then((CACHE_NAME) => {
      return Promise.all(
        CACHE_NAME.map(
          (cache) => {
            if (cache !== CACHE_NAME) {
              console.log('Service Worker: activate: Clearing Old Cache');
              return caches.delete(cache);
            }
          }
        )
      ).then(() => {
        // Send a message to all controlled pages
        self.clients.matchAll({type: 'window'}).then((clients) => {
          clients.forEach(client => {
            client.postMessage({type: 'SW_RELOAD_PAGE'});
          });
        });
      });
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});



function shouldRedirect(pathname) {
  if (pathname == '/how-to-use-as-a-traveler.html') {
    return '/user-help/';
  }
  if (pathname == '/user-help') {
    return '/user-help/';
  }

  if (pathname == '/how-to-place-your-ad.html') {
    return '/merchant-help/';
  }
  if (pathname == '/merchant-help') {
    return '/merchant-help/';
  }

  if (pathname == '/road-map.html') {
    return '/road-map/';
  }
  if (pathname == '/road-map') {
    return '/road-map/';
  }

  if (pathname == '/about-us.html') {
    return '/about-us/';
  }
  if (pathname == '/about-us') {
    return '/about-us/';
  }

  return null;
}



self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Check if this is a special request
  if (event.request.url.includes('/weatherforecast/')) {
    event.respondWith(handleCustomRequest(event.request, 'geoId', MAX_CACHE_AGE));
    return;
  }

  // Check if this is a special request
  if (event.request.url.includes('/exchangerates/')) {
    event.respondWith(handleCustomRequest(event.request, 'dummy', MAX_CACHE_AGE));
    return;
  }

  // Check if this is a special request
  if (event.request.url.includes('/precisiontime/')) {
    event.respondWith(handlePrecisiontimeRequest(event.request, MAX_CACHE_AGE * 4));
    return;
  }

  // Check if this is a special request
  if (event.request.url.includes('/autocomplete2/')) {
    event.respondWith(handleCustomRequest(event.request, 'key', MAX_CACHE_AGE * 4 * 7));
    return;
  }

  // Check if this is a special request
  if (event.request.url.includes('/topolocalads/')) {
    event.respondWith(handleCustomRequest(event.request, 'geoId', MAX_CACHE_AGE * 4 * 7));
    return;
  }

  const urlObj = new URL(event.request.url);
  const redirPathname = shouldRedirect(urlObj.pathname);

  if ((event.request.mode == 'navigate') && redirPathname) {
    event.respondWith(handleOrdinaryRequest301(event.request, redirPathname));
    return;
  }

  // Your existing GET handler for normal requests
  event.respondWith(handleOrdinaryRequest(event.request));
});



function convertSearchParamsToJsonObject(searchString) {
  const params = new URLSearchParams(searchString);
  const result = {};

  // Using forEach to naturally overwrite duplicates with last value
  params.forEach((value, key) => {
    result[key] = value; // Simply take the last occurrence
  });

  return result;
}



function convertJsonObjectToSearchParams(obj) {
  return new URLSearchParams(obj).toString();
}



async function handleOrdinaryRequest301(request, redirPath) {
  const urlObj = new URL(request.url);
  return Response.redirect(urlObj.origin + redirPath + urlObj.search, 301); // + urlObj.search
}



async function handleOrdinaryRequest(request) {
  let cacheKey = request.url;

  if (request.url.includes('#')) {
    const requestUrlArr = request.url.split('#');
    cacheKey = requestUrlArr[0];
  }

  const cache = await caches.open(CACHE_NAME);

  // 2. Try to get cached response
  const cachedResponse = await cache.match(cacheKey);

  // 3. Check if cache is fresh
  if (cachedResponse) {
    console.log(`handleOrdinaryRequest(): cachedResponse, cacheKey:${cacheKey} SUCCESS`);
    return cachedResponse;
  }

  try {
    const response = await fetch(cacheKey);
    if (response.ok) {
      const clone = response.clone();

      await cache.put(cacheKey, clone);

      const cachedResponse2 = await cache.match(cacheKey);
      if (cachedResponse2) {
        console.log(`handleOrdinaryRequest(): fetch, cache.put: cacheKey:${cacheKey} SUCCESS`);
        return cachedResponse2;
      }
    }

    console.warn(`handleOrdinaryRequest(): !response.ok ResponseInternal: cacheKey:${cacheKey} FAIL`);
    return ResponseInternal.clone();
  } catch (err) {
    console.warn('handleOrdinaryRequest(): fetch failed, serving stale:', err);
  }

  // Create a synthetic 404 response with JSON body
  console.warn(`handleOrdinaryRequest(): ResponseNotFound, cacheKey:${cacheKey} FAIL`);
  return ResponseNotFound.clone();
}



async function handleCustomRequest(request, primaryKeyName, max_cache_age) {
  const now = new Date(Date.now());

  let cacheKey = request.url;
  let search_params = null;
  let primary_key = null;
  let base_url = null;

  if (request.url.includes('?')) {
    // 1. Extract cache key (original URL without ? fragment)
    const requestUrlArr = request.url.split('?');
    base_url = requestUrlArr[0];
    cacheKey = requestUrlArr[0];
console.log("cacheKey: "+cacheKey);
    if(primaryKeyName !== '') {
      search_params = convertSearchParamsToJsonObject(requestUrlArr[1]);
console.log("search_params: "+JSON.stringify(search_params));
      primary_key = search_params[primaryKeyName];
console.log("primary_key: "+primary_key);
      cacheKey = requestUrlArr[0] + primary_key;
      //delete search_params[primaryKeyName];
    }
  }

  const cache = await caches.open(CACHE_NAME);

  // 2. Try to get cached response
  const cachedResponse = await cache.match(cacheKey);

  // 3. Check if cache is fresh
  if (cachedResponse) {
console.log("TIME now.getTime(): "+now.getTime());
console.log("TIME cachedResponse.headers.fetched_timestamp get: "+cachedResponse.headers.get('fetched_timestamp'));
    const notExpired = (now.getTime() - parseInt(cachedResponse.headers.get('fetched_timestamp')) < max_cache_age);
    if (notExpired) {
      console.log(`handleCustomRequest(): cachedResponse, cacheKey:${cacheKey} SUCCESS`);
      return cachedResponse;
    }
  }

  try {
    // 4. Create synthetic request from cached data
    let syntheticUrl = `${cacheKey}`;
    if (search_params !== null) {
      //search_params[primaryKeyName] = primary_key;
      const sparamsStr = convertJsonObjectToSearchParams(search_params);
      const url = base_url;
      syntheticUrl = `${url}?${sparamsStr}`;
    }

    console.log('syntheticUrl: ' + syntheticUrl);
    const response = await fetch(syntheticUrl);

    if (response.ok) {
      const clone = response.clone();

      // Modify headers for cached version
      const cachedHeaders = new Headers(response.headers);
      cachedHeaders.set('fetched_timestamp', '' + now.getTime());

      // Create new response with modified headers for caching
      const cachedResponse = new Response(clone.body, {
        status: response.status
        , statusText: response.statusText
        , headers: cachedHeaders
      });

      await cache.put(cacheKey, cachedResponse);

      const cachedResponse2 = await cache.match(cacheKey);
      if (cachedResponse2) {
        console.log(`handleCustomRequest(): fetch, cache.put: cacheKey:${cacheKey} SUCCESS`);
        return cachedResponse2;
      }
    }

    console.warn(`handleCustomRequest(): fetch, !response.ok ResponseInternal: cacheKey:${cacheKey} WHAT NEXT?`);

    if (cachedResponse) {
      console.warn(`handleCustomRequest(): old cachedResponse, cacheKey:${cacheKey} WARN`);
      return cachedResponse;
    }

    console.warn(`handleCustomRequest(): ResponseInternal, cacheKey:${cacheKey} FAIL`);
    return ResponseInternal.clone();
  } catch (err) {
    console.warn(`handleCustomRequest(): fetch failed, serving stale: ${err} WHAT NEXT?`);
  }

  if (cachedResponse) {
    console.warn(`handleCustomRequest(): old cachedResponse, cacheKey:${cacheKey} WARN`);
    return cachedResponse;
  }

  // Create a synthetic 404 response with JSON body
  console.warn(`handleCustomRequest(): ResponseNotFound, cacheKey:${cacheKey} FAIL`);
  return ResponseNotFound.clone();
}



var globalPrecisiontimeData = null;
var globalSyncedUTCDateTime = null;
var globalDiffMilliseconds = 0;



async function handlePrecisiontimeRequest(request, max_cache_age) {
  const now = new Date(Date.now());

  let cacheKey = request.url;

  const cache = await caches.open(CACHE_NAME);

  // 2. Try to get cached response
  const cachedResponse = await cache.match(cacheKey);

  // 3. Check if cache is fresh
  if (cachedResponse) {
console.log("TIME handlePrecisiontimeRequest now.getTime(): "+now.getTime());
console.log("TIME handlePrecisiontimeRequest cachedResponse.headers.fetched_timestamp get: "+cachedResponse.headers.get('fetched_timestamp'));
    const notExpired = (now.getTime() - parseInt(cachedResponse.headers.get('fetched_timestamp')) < max_cache_age);
    if (notExpired) {
      console.log(`handlePrecisiontimeRequest(): cachedResponse, cacheKey:${cacheKey} SUCCESS`);

      const tmpd = new Date(Date.now());
      let dateMilliseconds = tmpd.getTime();
      dateMilliseconds -= globalDiffMilliseconds;

      const localResponse = new Response(
        JSON.stringify({
          currentISO8601UTCTime: new Date(dateMilliseconds).toISOString(),
          //iso: new Date(Date.now()).toISOString(),
          statusFlight: 'Success'
        }),
        {
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
            , 'fetched_timestamp' : cachedResponse.headers.get('fetched_timestamp')
          }
        }
      );

      return localResponse;
    }
  }

  try {
    // 4. Create synthetic request from cached data
    console.log('cacheKey: ' + cacheKey);
    const response = await fetch(cacheKey);

    if (response.ok) {
      const clone = response.clone();
      const clone2 = response.clone();

      // Modify headers for cached version
      const cachedHeaders = new Headers(response.headers);
      cachedHeaders.set('fetched_timestamp', '' + now.getTime());

      // Create new response with modified headers for caching
      const cachedResponse = new Response(clone.body, {
        status: response.status
        , statusText: response.statusText
        , headers: cachedHeaders
      });

      await cache.put(cacheKey, cachedResponse);


      const responseData = await clone2.json();
      globalPrecisiontimeData = responseData; // always valid time data at Haskell server

      globalSyncedUTCDateTime = new Date(globalPrecisiontimeData.currentISO8601UTCTime);
      const tmpdInit = new Date(Date.now());
      const dateMillisecondsInit = tmpdInit.getTime();
      globalDiffMilliseconds = dateMillisecondsInit - globalSyncedUTCDateTime.getTime();
      console.log("handlePrecisiontimeRequest(): globalDiffMilliseconds="+globalDiffMilliseconds);

      const tmpd = new Date(Date.now());
      let dateMilliseconds = tmpd.getTime();
      dateMilliseconds -= globalDiffMilliseconds;

      const localResponse = new Response(
        JSON.stringify({
          currentISO8601UTCTime: new Date(dateMilliseconds).toISOString(),
          //iso: new Date(Date.now()).toISOString(),
          statusFlight: 'Success'
        }),
        {
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
            , 'fetched_timestamp' : cachedResponse.headers.get('fetched_timestamp')
          }
        }
      );
      console.log(`handlePrecisiontimeRequest(): fetch, cache.put: cacheKey:${cacheKey} SUCCESS`);
      return localResponse;
    }

    console.warn(`handlePrecisiontimeRequest(): fetch, !response.ok ResponseInternal: cacheKey:${cacheKey} WHAT NEXT?`);

    if (cachedResponse) {
      const tmpd = new Date(Date.now());
      let dateMilliseconds = tmpd.getTime();
      dateMilliseconds -= globalDiffMilliseconds;

      const localResponse = new Response(
        JSON.stringify({
          currentISO8601UTCTime: new Date(dateMilliseconds).toISOString(),
          //iso: new Date(Date.now()).toISOString(),
          statusFlight: 'Success'
        }),
        {
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
            , 'fetched_timestamp' : cachedResponse.headers.get('fetched_timestamp')
          }
        }
      );

      console.warn(`handlePrecisiontimeRequest(): old localResponse, cacheKey:${cacheKey} WARN`);
      return localResponse;
    }

    console.warn(`handlePrecisiontimeRequest(): ResponseInternal, cacheKey:${cacheKey} FAIL`);
    return ResponseInternal.clone();
  } catch (err) {
    console.warn(`handlePrecisiontimeRequest(): fetch failed, serving stale: ${err} WHAT NEXT?`);
  }

  if (cachedResponse) {
    const tmpd = new Date(Date.now());
    let dateMilliseconds = tmpd.getTime();
    dateMilliseconds -= globalDiffMilliseconds;

    const localResponse = new Response(
      JSON.stringify({
        currentISO8601UTCTime: new Date(dateMilliseconds).toISOString(),
        //iso: new Date(Date.now()).toISOString(),
        statusFlight: 'Success'
      }),
      {
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
          , 'fetched_timestamp' : cachedResponse.headers.get('fetched_timestamp')
        }
      }
    );

    console.warn(`handlePrecisiontimeRequest(): old localResponse, cacheKey:${cacheKey} WARN`);
    return localResponse;
  }

  // Create a synthetic 404 response with JSON body
  console.warn(`handlePrecisiontimeRequest(): ResponseNotFound, cacheKey:${cacheKey} FAIL`);
  return ResponseNotFound.clone();
}
