import React, { useEffect, useState } from "react";

const LeadModal = ({ active, handleModal, token, id, setErrorMessage }) => {
  const [exam, setExam] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    const getExam = async () => {
      const requestOptions = {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
      };
      const response = await fetch(`http://localhost:8000/exam/${id}/`, requestOptions);

      if (!response.ok) {
        setErrorMessage("Could not get the exam");
      } else {
        const data = await response.json();
        setExam(data.title);
        setDescription(data.description);
      }
    };

    if (id) {
      getExam();
    }
  }, [id, token]);

  const cleanFormData = () => {
    setExam("");
    setDescription("");
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();
    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({
        title: exam,
        description: description,
      }),
    };
    const response = await fetch("http://localhost:8000/exam/", requestOptions);
    if (!response.ok) {
      setErrorMessage("Something went wrong when creating exam");
    } else {
      cleanFormData();
      handleModal();
    }
  };

  const handleUpdateLead = async (e) => {
    e.preventDefault();
    const requestOptions = {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({
        title: exam,
        description: description,
      }),
    };
    const response = await fetch(`http://localhost:8000/exam/${id}`, requestOptions);
    if (!response.ok) {
      setErrorMessage("Something went wrong when updating exam");
    } else {
      cleanFormData();
      handleModal();
    }
  };

  return (
    <div className={`modal ${active && "is-active"}`}>
      <div className="modal-background" onClick={handleModal}></div>
      <div className="modal-card">
        <header className="modal-card-head has-background-primary-light">
          <h1 className="modal-card-title">
            {id ? "Update Exam" : "Create Exam"}
          </h1>
        </header>
        <section className="modal-card-body">
          <form>
            <div className="field">
              <label className="label">Title</label>
              <div className="control">
                <input
                  type="text"
                  placeholder="Enter exam name"
                  value={exam}
                  onChange={(e) => setExam(e.target.value)}
                  className="input"
                  required
                />
              </div>
            </div>
            <div className="field">
              <label className="label">Description</label>
              <div className="control">
                <input
                  type="text"
                  placeholder="Enter description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input"
                  required
                />
              </div>
            </div>
          </form>
        </section>
        <footer className="modal-card-foot has-background-primary-light">
          {id ? (
            <button className="button is-info" onClick={handleUpdateLead}>
              Update
            </button>
          ) : (
            <button className="button is-primary" onClick={handleCreateExam}>
              Create
            </button>
          )}
          <button className="button" onClick={handleModal}>
            Cancel
          </button>
        </footer>
      </div>
    </div>
  );
};

export default LeadModal;