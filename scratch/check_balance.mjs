
import fs from 'fs'

const content = fs.readFileSync('/Users/yoddiehauz/Downloads/Plataformas/Brincolines Bambinos/rentaunbrincolin-socios/app/[partner]/CatalogClient.tsx', 'utf8')

let braces = 0
let parens = 0
let brackets = 0

for (let i = 0; i < content.length; i++) {
  const c = content[i]
  if (c === '{') braces++
  if (c === '}') braces--
  if (c === '(') parens++
  if (c === ')') parens--
  if (c === '[') brackets++
  if (c === ']') brackets--
  
  if (braces < 0) console.log('Extra brace at', i)
  if (parens < 0) console.log('Extra paren at', i)
  if (brackets < 0) console.log('Extra bracket at', i)
}

console.log('Braces:', braces)
console.log('Parens:', parens)
console.log('Brackets:', brackets)
