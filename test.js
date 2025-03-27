let regions = new Map()
regions.set("lol", "xd")
regions.set("yes", "pom")
regions.set("lol", "xd2")

regions.forEach((key, value) => {
  console.log(key) //mutace si nechávaj místo, nejsou na konci
});