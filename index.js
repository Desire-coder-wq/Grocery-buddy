const addBtn = document.getElementById("addBtn");
const itemInput = document.getElementById("itemInput");
const groceryList = document.getElementById("groceryList");

addBtn.addEventListener("click", addItem);
itemInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") addItem();
});

function addItem() {
  const itemText = itemInput.value.trim();
  if (itemText === "") return alert("Please enter an item");

  const li = document.createElement("li");
  li.textContent = itemText;

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "❌";
  deleteBtn.classList.add("deleteBtn");

  li.appendChild(deleteBtn);
  groceryList.appendChild(li);

  li.addEventListener("click", () => li.classList.toggle("bought"));
  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    li.remove();
  });

  itemInput.value = "";
}
