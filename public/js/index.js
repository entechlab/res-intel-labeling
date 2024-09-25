

let states = { 'hide-button': true }
const prefix_url = 'public/imgs/'
let examples = []

function getOriginalImgSize(imgSrc) {
    return new Promise((resolve, reject) => {
        let tmpImage = new Image()
        tmpImage.onload = function () {
            resolve({ width: this.width, height: this.height })
        }
        tmpImage.onerror = reject
        tmpImage.src = prefix_url + imgSrc
    })
}

function add_examples()
{
  return ['p10443055_b3754.jpg',
         '12738_12769001_60961980.jpg',
         'p00318025_b15649.jpg',
         'p02254016_b5682.jpg',
         'p02225041_b20237.jpg',
         '1260_14203041_60751986.jpg',
         // 'p01538005_b23042.jpg',
         '3211_12005098_60811988.jpg',
         '12846_13228123_60881978.jpg',
         'p11002015_b8957.jpg',
         'p02208044_b7505.jpg',
         '1776_14205045_60721983.jpg',
         'p02812025_b23806.jpg']

}
function add_images() {
    const div_imgs = document.getElementById('image_collection')
    let path_to_element = {}
    for (const path of examples) {
        let img_poly_container = document.createElement('div')
        // img_poly_container.setAttribute("id", path + "_div")
        img_poly_container.setAttribute('class', 'img-poly')
        let new_img = document.createElement('img')
        new_img.setAttribute('data-original', path)
        path_to_element[path] = img_poly_container
        new_img.src = prefix_url + path + '?csf=1&web'
        new_img.className += ' object-fill'
        new_img.className += ' darkened'
        // br creation
        const br = document.createElement('br')
        // svg creation
        let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        svg.setAttribute('class', 'vector')
        // tooltip creation
        let tooltip = document.createElement('div')
        tooltip.setAttribute('style', 'display:none;')
        tooltip.setAttribute('class', 'tooltip')
        // svg.setAttribute('viewBox', '0 0 500 500')
        // add to div container
        img_poly_container.appendChild(new_img)
        img_poly_container.appendChild(svg)
        img_poly_container.appendChild(tooltip)
        img_poly_container.appendChild(br)
        // add to parent containe
        div_imgs.appendChild(img_poly_container)
    }
    return path_to_element
}

async function readColorMap(path) {
    return fetch(path)
        .then((response) => response.text())
        .then((content) => {
            let colorMap = {}
            let lines = content.split('\n')
            for (let line of lines) {
                if (line == '') continue
                let color = line.split(' ').slice(0, 3).join(',')
                let label = line.split(' ').slice(3).join(' ')
                colorMap[label] = color
            }
            console.log(colorMap)
            const legendColorList = document.getElementById('legend-color')
            const legendLabelList = document.getElementById('legend-label')
            for (let label in colorMap) {
                const liColor = document.createElement('li')
                const liLabel = document.createElement('li')
                liColor.className = 'items-center mt-1 pr-2'
                liLabel.className = 'items-center text-right mt-1'
                liColor.innerHTML = `
              <span class="w-4 h-2 inline-block mx-auto" style="background-color:rgb(${colorMap[label]})"></span>
                `
                liLabel.innerHTML = `
              <span class="text-sm"> ${label}</span>
            `
                legendColorList.appendChild(liColor)
                legendLabelList.appendChild(liLabel)
            }
            return colorMap
        })
}
async function extract_annotations(path) {
    return fetch(path, { mode: 'cors' })
        .then((response) => response.json())
        .then((dataset) => {
            let id_img_mapping = {}
            let annotations = {}
            let categories = {}
            for (let img of dataset['images']) {
                id_img_mapping[img['id']] = img['file_name']
            }
            for (let category of dataset['categories']) {
                categories[category['id']] = category['name']
            }
            let img_to_svg = {}
            for (let anno of dataset['annotations']) {
                let imgname = id_img_mapping[anno['image_id']]
                if (imgname in annotations) {
                    annotations[imgname].push(anno)
                } else annotations[imgname] = [anno]
                // let elem = filename_to_element[imgname]
                // let svg = null
                // let poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon")
                // svg.appendChild(poly)
                // poly.setAttribute("points", anno["segmentation"])
                // poly.setAttribute("class", "mask")
            }
            return [annotations, categories]
        })
}

examples = add_examples()
let filename_to_element = add_images()
let res = Promise.all([
    extract_annotations('public/new_annotations.json', filename_to_element),
    readColorMap('public/label_colors.txt'),
]).then(([annosCategories, colorMap]) => {
    let imgAnnos = annosCategories[0],
        categories = annosCategories[1]
    let promises = []
    const containers = document.querySelectorAll('.img-poly')
    containers.forEach((container) => {
        const img = container.querySelector('img')
        const svg = container.querySelector('svg')
        const tooltip = container.querySelector('.tooltip')

        const imgSrc = img.dataset.original
        const promise = getOriginalImgSize(imgSrc)
        promise.then((origDimensions) => {
            svg.innerHTML = ''
            svg.setAttribute('viewBox', [0, 0, img.width, img.height])
            const imgWidth = img.width
            const imgHeight = img.height

            const scaleX = imgWidth / origDimensions.width
            const scaleY = imgHeight / origDimensions.height

            let annos = imgAnnos[imgSrc]
            if (! annos)
              console.log(imgSrc)
            for (let anno of annos) {
                let scaledPoints = anno['segmentation'][0].map(
                    function (item, index) {
                        return item * (index & 1 ? scaleX : scaleY)
                    }
                )
                // console.log('scaled:' + scaledPoints)
                // console.log('orig:' + poly)
                const polygon = document.createElementNS(
                    'http://www.w3.org/2000/svg',
                    'polygon'
                )
                let scaledPoly = scaledPoints.join(',')
                let label = categories[anno['category_id']]
                polygon.setAttribute('points', scaledPoly)
                polygon.setAttribute('fill', 'rgba(' + colorMap[label] + ')')
                polygon.setAttribute('fill-opacity', '0.3')
                function showTooltip(event, label) {
                    tooltip.textContent = label
                    tooltip.style.display = 'block'
                    polygon.setAttribute('fill-opacity', '0.7')
                    moveTooltip(event)
                }

                function hideTooltip() {
                    tooltip.style.display = 'none'
                    polygon.setAttribute('fill-opacity', '0.3')
                }

                function moveTooltip(event) {
                    const rect = container.getBoundingClientRect()
                    tooltip.style.left = `${event.clientX - rect.left + 10}px`
                    tooltip.style.top = `${event.clientY - rect.top + 10}px`
                }

                //adding event listener for popolygon.addEventListener('mouseenter', (e) => showTooltip(e, label));
                polygon.setAttribute('stroke', 'white')
                polygon.setAttribute('stroke-width', '1')
                polygon.setAttribute('stroke-dasharray', '8,4')

                polygon.setAttribute('class', 'poly')
                polygon.addEventListener('mouseleave', hideTooltip)
                polygon.addEventListener('mousemove', moveTooltip)
                polygon.addEventListener('mouseenter', (e) =>
                    showTooltip(e, label)
                )
                svg.appendChild(polygon)
            }
        })
        promises.push(promise)
    })
})
console.log(res)
document.getElementById('hide-button').addEventListener('click', (e) => {
    console.log(e.target.id)
    if (states[e.target.id]) {
        let polys = document.querySelectorAll('.poly')
        polys.forEach((poly) => poly.setAttribute('style', 'display:none;'))
        e.target.innerHTML = 'Show Image Labels'
        states[e.target.id] = false

    } else {
        let polys = document.querySelectorAll('.poly')
        polys.forEach((poly) => poly.removeAttribute('style'))
        e.target.innerHTML = 'Hide Image Labels'
        states[e.target.id] = true
    }
    // toggle darkened style from image
    let imgs = document.querySelectorAll("img")
    imgs.forEach((img) => img.classList.toggle("darkened"))
})

const legend = document.getElementById('legend')
const toggleButton = document.getElementById('toggle-legend')

toggleButton.addEventListener('click', () => {
    legend.classList.toggle('invisible')
    legend.classList.toggle('opacity-0')
    legend.classList.toggle('opacity-100')
    legend.classList.toggle('bg-white')
})
