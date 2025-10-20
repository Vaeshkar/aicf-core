const handleDelete = async (id) => {
  if (window.confirm('Are you sure you want to delete this todo?')) {
    await onDelete(id);
  }
};