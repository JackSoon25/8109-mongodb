Prompt to generate test data:
```
Create for me a recipes.json file, as an array of objects, each object consisting of the following keys
- name
- description
- ingredients, array of objects, each object has name, unit and amount
- list of associated tags (make sure to refer to the id and the name in tags.json using the $oid format)
- cuisine (make sure to the to the id and the name in cuisines.json using the $oid format)
- instructions as an array of strings
```