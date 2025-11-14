export default async function fetchTemplate(file, selector) {
    const domParser = new DOMParser();
    const template = domParser.parseFromString(
        await (await fetch(file)).text(),
        'text/html'
    );
    return template.querySelector(selector);
}