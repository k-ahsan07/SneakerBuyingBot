const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

/**
 * Add to cart and checkout using Puppeteer with Stealth plugin.
 * @param {object} opts
 * @param {import('puppeteer').Browser} opts.browserInstance
 * @param {import('puppeteer').Page} opts.page
 * @throws on failure
 */
async function addToCartAndCheckout({ browserInstance, page }) {
  const url = 'https://www.on.com/en-ch/products/cloudrunner-2-m-3me1014/mens/rock-tangerine-shoes-3ME10144284?variant=5';
  console.log('Navigating to product page...');
  await page.goto(url, { waitUntil: 'networkidle2' });
  console.log('Waiting for size popover...');
  await page.waitForSelector('#pdp-product-size-popover', { timeout: 1000000000 });
  console.log('Selecting size 44.5...');
  const sizeSelected = await page.evaluate(() => {
    const sizeButtons = Array.from(document.querySelectorAll('button[data-test-id="purchasePodSizeButton"]'));
    const btn = sizeButtons.find(b => b.innerText.trim().startsWith('44.5'));
    if (btn) { btn.click(); return true; }
    return false;
  });
  if (!sizeSelected) throw new Error('Size 44.5 not found or not clickable.');
  console.log('Waiting for Add to bag button to be enabled...');
  await page.waitForFunction(() => {
    const btn = document.querySelector('button[data-test-id="addToCartButton"]');
    return btn && !btn.disabled;
  }, { timeout: 10000 });
  console.log('Clicking Add to bag...');
  await page.evaluate(() => {
    const btn = document.querySelector('button[data-test-id="addToCartButton"]');
    if (btn) btn.click();
  });
  console.log('Waiting 2 seconds...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log('Clicking Checkout...');
  const checkoutClicked = await page.evaluate(() => {
    const btn = document.querySelector('button[data-test-id="checkoutBtn"]');
    if (btn) { btn.click(); return true; }
    return false;
  });
  if (!checkoutClicked) throw new Error('Checkout button not found or not clickable.');
  console.log('Checkout button clicked. Waiting for redirect to payment page...');
  // Wait for redirect to payment page
  try {
    await page.waitForFunction(
      () => window.location.href.startsWith('https://checkout.on.com/checkouts/'),
      { timeout: 30000 }
    );
    console.log('Redirected to payment page:', page.url());
  } catch (e) {
    throw new Error('Did not redirect to payment page within 30 seconds.');
  }
}

/**
 * Generate a random valid Swiss phone number (format: 07x xxx xx xx)
 */
function generateSwissPhoneNumber() {
  // Swiss mobile numbers start with 076, 077, 078, 079, 075, 074
  const prefixes = ['076', '077', '078', '079', '075', '074'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const rest = String(Math.floor(10000000 + Math.random() * 89999999)).padStart(8, '0');
  // Format: 07x xxx xx xx
  return `${prefix} ${rest.slice(0,3)} ${rest.slice(3,5)} ${rest.slice(5,7)}`;
}

/**
 * Get a random Swiss address, city, and postal code (aligned)
 */
function getRandomSwissAddress() {
  // Example Swiss addresses (city, postal code, address)
  const swissAddresses = [
    { city: 'Zurich', postalCode: '8001', address: 'Bahnhofstrasse 1' },
    { city: 'Geneva', postalCode: '1201', address: 'Rue du Rhône 10' },
    { city: 'Bern', postalCode: '3011', address: 'Marktgasse 20' },
    { city: 'Basel', postalCode: '4001', address: 'Freie Strasse 50' },
    { city: 'Lausanne', postalCode: '1003', address: 'Place de la Palud 5' },
    { city: 'Lucerne', postalCode: '6003', address: 'Hertensteinstrasse 34' },
    { city: 'St. Gallen', postalCode: '9000', address: 'Neugasse 56' },
    { city: 'Lugano', postalCode: '6900', address: 'Via Nassa 7' },
    { city: 'Winterthur', postalCode: '8400', address: 'Stadthausstrasse 14' },
    { city: 'Biel/Bienne', postalCode: '2502', address: 'Bahnhofplatz 12' }
  ];
  return swissAddresses[Math.floor(Math.random() * swissAddresses.length)];
}

/**
 * Fill the shipping form with provided data, skipping address, city, and postal code if already filled.
 * @param {import('puppeteer').Page} page
 */
async function fillShippingForm(page) {
  console.log('Filling shipping form...');
  // Generate random Swiss address
  const { address, city, postalCode } = getRandomSwissAddress();
  console.log(`Generated address: ${address}, ${postalCode} ${city}`);

  // First name
  const firstNameSelector = 'input[name="firstName"]';
  await page.click(firstNameSelector, { clickCount: 3 });
  await page.keyboard.press('Backspace');
  await page.type(firstNameSelector, 'Bruno', { delay: 50 });

  // Last name
  const lastNameSelector = 'input[name="lastName"]';
  await page.click(lastNameSelector, { clickCount: 3 });
  await page.keyboard.press('Backspace');
  await page.type(lastNameSelector, 'Pakistan', { delay: 50 });

  // Address
  const addressSelector = 'input[name="address1"]';
  await page.click(addressSelector, { clickCount: 3 });
  await page.keyboard.press('Backspace');
  await page.type(addressSelector, address, { delay: 50 });

  // Apartment
  const apartmentSelector = 'input[name="address2"]';
  await page.click(apartmentSelector, { clickCount: 3 });
  await page.keyboard.press('Backspace');
  await page.type(apartmentSelector, '123 ABC', { delay: 50 });

  // Postal code
  const postalSelector = 'input[name="postalCode"]';
  await page.click(postalSelector, { clickCount: 3 });
  await page.keyboard.press('Backspace');
  await page.type(postalSelector, postalCode, { delay: 50 });

  // City
  const citySelector = 'input[name="city"]';
  await page.click(citySelector, { clickCount: 3 });
  await page.keyboard.press('Backspace');
  await page.type(citySelector, city, { delay: 50 });

  // Phone (only if not already filled)
  const phoneSelector = 'input[name="phone"]';
  const phoneValue = await page.$eval(phoneSelector, el => el.value);
  if (!phoneValue) {
    const phone = generateSwissPhoneNumber();
    console.log('Generated Swiss phone number:', phone);
    await page.type(phoneSelector, phone, { delay: 50 });
  }

  console.log('Shipping form filled.');
}

if (require.main === module) {
  (async () => {
    let exitCode = 0;
    let browserInstance = null;
    const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
    const executablePath = chromePath;
    try {
      console.log('Launching browser: chrome');
      browserInstance = await puppeteer.launch({ headless: false, executablePath });
      const page = await browserInstance.newPage();
      await addToCartAndCheckout({ browserInstance, page });
      // Wait for email field and type email
      await page.waitForSelector('#email');
      await page.type('#email', 'khuziahsan07@gmail.com', { delay: 50 });
      await fillShippingForm(page);
    } catch (err) {
      exitCode = 1;
      console.error('Error:', err.message);
    } finally {
      // Do not close the browser automatically; leave it open for manual inspection
      // if (browserInstance) {
      //   try { await browserInstance.close(); } catch (e) { /* ignore */ }
      // }
      // process.exit(exitCode);
    }
  })();
}

module.exports = { addToCartAndCheckout };
